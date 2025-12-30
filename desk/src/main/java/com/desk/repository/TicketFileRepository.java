package com.desk.repository;

import com.desk.domain.TicketFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketFileRepository extends JpaRepository<TicketFile, String> {

    // 전체 파일 조회 (작성자 혹은 수신자가 나이면서, 파일명/작성자/수신자에 키워드 포함)
    @Query("SELECT f FROM TicketFile f WHERE (f.writer = :email OR f.receiver = :email) " +
            "AND (f.fileName LIKE %:kw% OR f.writer LIKE %:kw% OR f.receiver LIKE %:kw%)")
    Page<TicketFile> findAllByEmailAndSearch(@Param("email") String email, @Param("kw") String kw, Pageable pageable);

    // 내가 보낸 파일
    @Query("SELECT f FROM TicketFile f WHERE f.writer = :email " +
            "AND (f.fileName LIKE %:kw% OR f.writer LIKE %:kw% OR f.receiver LIKE %:kw%)")
    Page<TicketFile> findByWriterAndSearch(@Param("email") String email, @Param("kw") String kw, Pageable pageable);

    // 내가 받은 파일
    @Query("SELECT f FROM TicketFile f WHERE f.receiver = :email " +
            "AND (f.fileName LIKE %:kw% OR f.writer LIKE %:kw% OR f.receiver LIKE %:kw%)")
    Page<TicketFile> findByReceiverAndSearch(@Param("email") String email, @Param("kw") String kw, Pageable pageable);
}