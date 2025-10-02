package com.traininginsights.repository;

import com.traininginsights.model.Training;
import com.traininginsights.model.TrainingAttendance;
import com.traininginsights.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TrainingAttendanceRepository extends JpaRepository<TrainingAttendance, Long> {
    Optional<TrainingAttendance> findByTrainingAndUser(Training training, User user);
    List<TrainingAttendance> findByTraining(Training training);
    List<TrainingAttendance> findByUser(User user);
    long countByTrainingAndPresentIsTrue(Training training);
    long countByTraining(Training training);
    long countByUserAndPresentIsTrue(User user);
    long countByUser(User user);
}
