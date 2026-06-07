package com.meowdow.studyfarm.tags;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * A repository is our "data access layer" — it talks to the database so the rest
 * of the app doesn't have to know any SQL.
 *
 * We just declare an INTERFACE (no implementation!) that extends JpaRepository.
 * Spring Data JPA generates the actual implementation at runtime. From
 * JpaRepository<Tag, UUID> we already get, for free:
 *   - save(tag)        -> INSERT or UPDATE
 *   - findById(uuid)   -> SELECT ... WHERE tag_id = ?
 *   - findAll()        -> SELECT * FROM tags
 *   - deleteById(uuid) -> DELETE ...
 * The two type params mean: this manages Tag entities whose id is a UUID.
 */
@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {

    /**
     * "Derived query method": Spring reads the METHOD NAME and writes the SQL.
     * findByName -> SELECT * FROM tags WHERE name = ?
     * Returns Optional because the tag may or may not exist.
     */
    Optional<Tag> findByName(String name);

    /**
     * existsByName -> SELECT COUNT(...) > 0 ... WHERE name = ?
     * Handy, cheap way to check for duplicates before inserting.
     */
    boolean existsByName(String name);

    /**
     * findAllByOrderByNameAsc -> SELECT * FROM tags ORDER BY name ASC
     * Returns the full list alphabetically so the frontend can show a tidy list.
     */
    List<Tag> findAllByOrderByNameAsc();
}
