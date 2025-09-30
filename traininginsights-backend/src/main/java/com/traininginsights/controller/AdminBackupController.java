package com.traininginsights.controller;

import com.traininginsights.service.AdminBackupService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/backup")
public class AdminBackupController {
    private final AdminBackupService backupService;
    public AdminBackupController(AdminBackupService backupService){ this.backupService = backupService; }

    @PreAuthorize("hasRole('ROLE_SUPERADMIN')")
    @GetMapping("/export")
    public ResponseEntity<byte[]> export(){
        byte[] data = backupService.exportAll();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=ti-backup.json")
                .contentType(MediaType.APPLICATION_JSON)
                .body(data);
    }

    @PreAuthorize("hasRole('ROLE_SUPERADMIN')")
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String,Object> importBackup(@RequestPart("file") MultipartFile file) throws Exception{
        byte[] data = file.getBytes();
        return backupService.importFromBytes(data);
    }
}
