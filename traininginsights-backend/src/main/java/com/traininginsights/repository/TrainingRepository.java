package com.traininginsights.repository;

import com.traininginsights.model.Group;
import com.traininginsights.model.Training;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface TrainingRepository extends JpaRepository<Training, Long> {

    @Query("select t from Training t join t.groups g " +
            "where g = :group and t.trainingTime >= :from and t.isVisibleToAthletes = true order by t.trainingTime asc")
    List<Training> findUpcomingForGroup(@Param("group") Group group, @Param("from") Instant from);
}
