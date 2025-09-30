package com.traininginsights.repository;

import com.traininginsights.model.Attachment;
import com.traininginsights.model.Training;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByTraining(Training t);
}
