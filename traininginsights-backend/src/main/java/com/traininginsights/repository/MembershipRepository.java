package com.traininginsights.repository;

import com.traininginsights.model.Membership;
import com.traininginsights.model.Club;
import com.traininginsights.model.User;
import com.traininginsights.model.Season;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MembershipRepository extends JpaRepository<Membership, Long> {
    List<Membership> findByClub(Club club);
    List<Membership> findByUser(User user);
    List<Membership> findBySeason(Season season);
}
