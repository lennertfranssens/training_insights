package com.traininginsights.repository;

import com.traininginsights.model.Group;
import com.traininginsights.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    List<User> findByGroupEntity(Group group);
    boolean existsByEmailIgnoreCase(String email);
}
