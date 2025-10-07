package com.traininginsights.repository;

import com.traininginsights.model.Group;
import com.traininginsights.model.Training;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface TrainingRepository extends JpaRepository<Training, Long> {

    @Query("select t from Training t join t.groups g where g = :group and t.trainingTime >= :from order by t.trainingTime asc")
    List<Training> findUpcomingForGroup(@Param("group") Group group, @Param("from") Instant from);

    @Query("select t from Training t join t.groups g where g = :group order by t.trainingTime desc")
    List<Training> findAllForGroup(@Param("group") Group group);

    // Find all trainings that are associated with the given group id
    List<Training> findByGroups_Id(Long groupId);

    // Check whether a training with id exists that is associated with the given group id
    boolean existsByIdAndGroups_Id(Long id, Long groupId);

    // Recurrence helpers
    List<Training> findBySeries_Id(Long seriesId);
    List<Training> findBySeries_IdAndSeriesSequenceGreaterThanEqual(Long seriesId, Integer sequence);
    long countBySeries_Id(Long seriesId);
    long countBySeries_IdAndSeriesSequenceGreaterThanEqual(Long seriesId, Integer sequence);

    Training findFirstBySeries_IdAndSeriesSequence(Long seriesId, Integer sequence);
}
