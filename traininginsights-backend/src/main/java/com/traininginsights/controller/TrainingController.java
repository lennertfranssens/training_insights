package com.traininginsights.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.traininginsights.dto.TrainingDtos;
import com.traininginsights.model.QuestionnaireResponse;
import com.traininginsights.model.Training;
import com.traininginsights.model.User;
import com.traininginsights.service.QuestionnaireResponseService;
import com.traininginsights.service.TrainingService;
import com.traininginsights.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.traininginsights.model.Attachment;
import com.traininginsights.repository.AttachmentRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.io.IOException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import java.io.File;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;

@RestController
@RequestMapping("/api/trainings")
public class TrainingController {
    private final TrainingService service;
    private final UserRepository userRepository;
    private final AttachmentRepository attachmentRepository;
    private final QuestionnaireResponseService responseService;
    private final String uploadsDir;

    public TrainingController(TrainingService service, UserRepository userRepository, AttachmentRepository attachmentRepository, QuestionnaireResponseService responseService, @Value("${app.uploadsDir:uploads}") String uploadsDir){ this.service = service; this.userRepository = userRepository; this.attachmentRepository = attachmentRepository; this.responseService = responseService; this.uploadsDir = uploadsDir; }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping public java.util.List<Training> all(){ return service.all(); }
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @GetMapping("/{id}") public Training get(@PathVariable Long id){ return service.get(id); }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @Transactional(readOnly = true)
    @GetMapping("/by-group/{groupId}")
    public List<Training> byGroup(@PathVariable Long groupId){
        return service.all().stream()
                .filter(t -> t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getId().equals(groupId)))
                .toList();
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping
    public Training create(@RequestBody Training t){
        if (t.getTrainingEndTime() != null && !t.getTrainingEndTime().isAfter(t.getTrainingTime())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Training end time must be after start time");
        }
        return service.save(t);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PutMapping("/{id}") public Training update(@PathVariable Long id, @RequestBody Training t){
        if (t.getTrainingEndTime() != null && !t.getTrainingEndTime().isAfter(t.getTrainingTime())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Training end time must be after start time");
        }
        t.setId(id); return service.save(t);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id, Authentication auth){
        User caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        boolean isAdmin = caller.getRoles().stream().anyMatch(r -> r.getName().name().equals("ROLE_ADMIN") || r.getName().name().equals("ROLE_SUPERADMIN"));
        if (isAdmin){ service.delete(id); return; }
        // trainer: allow only if trainer is assigned to at least one group of the training
        var t = service.get(id);
        boolean trainerAssigned = t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getId().equals(caller.getId())));
        if (!trainerAssigned) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to delete this training");
        service.delete(id);
    }

    // Attachments
    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping(path="/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Attachment uploadAttachment(@PathVariable Long id, @RequestPart MultipartFile file) throws IOException{
        var t = service.get(id);
        // store file under uploads/<trainingId>/filename
    Path base = Paths.get(uploadsDir).toAbsolutePath();
    Path dir = base.resolve(String.valueOf(id));
    Files.createDirectories(dir);
    Path dst = dir.resolve(file.getOriginalFilename());
    file.transferTo(dst.toFile());
        Attachment a = new Attachment();
        a.setFilename(file.getOriginalFilename());
        a.setContentType(file.getContentType());
    a.setPath(dst.toString());
        a.setTraining(t);
        return attachmentRepository.save(a);
    }

    @GetMapping("/{id}/attachments")
    public java.util.List<Attachment> listAttachments(@PathVariable Long id){
        var t = service.get(id);
        return attachmentRepository.findByTraining(t);
    }

    @GetMapping("/attachments/{attachmentId}")
    public ResponseEntity<byte[]> download(@PathVariable Long attachmentId){
        Attachment a = attachmentRepository.findById(attachmentId).orElseThrow();
        File f = new File(a.getPath());
        if (!f.exists()){
            return ResponseEntity.notFound().build();
        }
        try {
            byte[] data = Files.readAllBytes(f.toPath());
            return ResponseEntity.ok().contentType(MediaType.parseMediaType(a.getContentType()!=null ? a.getContentType(): "application/octet-stream")).body(data);
        } catch (IOException e){
            // return 500 with a generic message instead of leaking filesystem details
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new byte[0]);
        }
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @DeleteMapping("/attachments/{attachmentId}")
    public void deleteAttachment(@PathVariable Long attachmentId){
        Attachment a = attachmentRepository.findById(attachmentId).orElseThrow();
        try { Files.deleteIfExists(Paths.get(a.getPath())); } catch (Exception ignored){}
        attachmentRepository.deleteById(attachmentId);
    }

    @PreAuthorize("hasRole('TRAINER')")
    @GetMapping("/mine")
    public List<Training> myTrainings(Authentication auth){
        // find trainings where authenticated trainer is assigned to one of the training groups
        return service.all().stream()
                .filter(t -> t.getGroups() != null && t.getGroups().stream().anyMatch(g -> g.getTrainers().stream().anyMatch(u -> u.getEmail().equalsIgnoreCase(auth.getName()))))
                .toList();
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping("/{id}/assign-groups")
    public Training assign(@PathVariable Long id, @RequestBody TrainingDtos.AssignGroupsRequest req){
        return service.assignGroups(id, req.groupIds);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @PostMapping("/{id}/set-questionnaires")
    public Training setQuestionnaires(@PathVariable Long id, @RequestParam(required=false) Long preId, @RequestParam(required=false) Long postId){
        return service.setQuestionnaires(id, preId, postId);
    }

    @PreAuthorize("hasAnyRole('TRAINER','ADMIN','SUPERADMIN')")
    @Transactional(readOnly = true)
    @GetMapping("/{id}/questionnaire-responses")
    public java.util.Map<String, java.util.List<java.util.Map<String,Object>>> getQuestionnaireResponses(@PathVariable Long id){
        Training t = service.get(id);
        java.util.List<QuestionnaireResponse> list = responseService.byTraining(t);
        java.util.List<java.util.Map<String,Object>> pre = new java.util.ArrayList<>();
        java.util.List<java.util.Map<String,Object>> post = new java.util.ArrayList<>();
        ObjectMapper om = responseService.getObjectMapper();
        Long preId = t.getPreQuestionnaire() != null ? t.getPreQuestionnaire().getId() : null;
        Long postId = t.getPostQuestionnaire() != null ? t.getPostQuestionnaire().getId() : null;
        for (QuestionnaireResponse r : list){
            java.util.Map<String,Object> m = new java.util.HashMap<>();
            m.put("id", r.getId());
            User u = r.getUser();
            java.util.Map<String,Object> uMap = new java.util.HashMap<>();
            uMap.put("id", u.getId()); uMap.put("firstName", u.getFirstName()); uMap.put("lastName", u.getLastName()); uMap.put("email", u.getEmail());
            m.put("user", uMap);
            m.put("submittedAt", r.getSubmittedAt());
            try {
                JsonNode node = om.readTree(r.getResponses());
                m.put("responses", node);
            } catch (Exception e){
                m.put("responses", r.getResponses());
            }
            m.put("questionnaireId", r.getQuestionnaire() != null ? r.getQuestionnaire().getId() : null);
            if (preId != null && r.getQuestionnaire() != null && preId.equals(r.getQuestionnaire().getId())) pre.add(m);
            else if (postId != null && r.getQuestionnaire() != null && postId.equals(r.getQuestionnaire().getId())) post.add(m);
        }
        java.util.Map<String, java.util.List<java.util.Map<String,Object>>> res = new java.util.HashMap<>();
        res.put("pre", pre); res.put("post", post);
        return res;
    }
}
