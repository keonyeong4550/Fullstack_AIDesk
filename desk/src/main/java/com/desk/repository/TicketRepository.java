package com.desk.repository;

import com.desk.domain.Ticket;
import com.desk.domain.UploadTicketFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;


public interface TicketRepository extends JpaRepository<Ticket, Long>, TicketSearch  {
    Optional<Ticket> findByTnoAndWriter_Email(Long tno, String email);

    @EntityGraph(attributePaths = "documentList")
    @Query("select p from Ticket p where p.tno = :tno")
    Optional<Ticket> selectOne(@Param("tno") Long tno);

    // 🔥 [수정됨] 보낸 티켓(writer) OR 받은 티켓(personalList.receiver) 모두 조회
    // 내가 쓴 티켓(t.writer) OR 내가 받은 티켓(p.receiver)에 포함된 파일(d)을 모두 조회
    // ticket_document_list 테이블과 ticket 테이블을 조인하여 가져옵니다.
    // 조건: 작성자(writer_email) 이거나 수신자(receiver_email) 인 경우
    // 복잡한 SQL 대신 안전한 JPQL 사용
    // 티켓의 documentList(파일들)을 가져오되, 내가 쓴 글이나 내가 받은 글만 필터링
    @Query("SELECT d " +
            "FROM Ticket t JOIN t.documentList d " +
            "LEFT JOIN t.personalList p " +
            "WHERE t.writer.email = :email OR p.receiver.email = :email " +
            "ORDER BY t.tno DESC")
    Page<UploadTicketFile> findAllFilesByUser(@Param("email") String email, Pageable pageable);
}
