import { useState, useEffect, useCallback, useRef } from "react";

/**
 * 가상 스크롤링을 지원하는 채팅 메시지 무한 스크롤 훅
 * @param {Array} messages - 전체 메시지 배열
 * @param {number} itemHeight - 각 메시지의 예상 높이 (px, 기본값: 80)
 * @param {number} overscan - 보이는 영역 위아래로 추가로 렌더링할 항목 수 (기본값: 5)
 * @returns {Object} { visibleMessages, startIndex, endIndex, topPadding, bottomPadding, onScroll, scrollToBottom, reset, setContainerRef, measureItemHeight }
 */
const useInfiniteChat = (messages = [], itemHeight = 80, overscan = 5) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  
  const prevMessagesLengthRef = useRef(messages.length);
  const prevLastMessageIdRef = useRef(messages.length > 0 ? messages[messages.length - 1]?.id : null);
  
  const containerRefRef = useRef(null);
  const itemHeightsRef = useRef(new Map()); // 실제 측정된 각 항목의 높이
  const totalHeightRef = useRef(0);
  const isInitialMountRef = useRef(true);
  const resizeObserverRef = useRef(null);

  // 컨테이너 높이 업데이트
  const updateContainerHeight = useCallback(() => {
    const container = containerRefRef.current;
    if (container) {
      setContainerHeight(container.clientHeight);
    }
  }, []);

  // 전체 높이 계산 (실제 측정된 높이 사용, 없으면 예상 높이)
  const calculateTotalHeight = useCallback(() => {
    let total = 0;
    for (let i = 0; i < messages.length; i++) {
      const measuredHeight = itemHeightsRef.current.get(i);
      total += measuredHeight || itemHeight;
    }
    totalHeightRef.current = total;
    return total;
  }, [messages.length, itemHeight]);

  // 보이는 범위 계산
  const calculateVisibleRange = useCallback((scrollTopValue, containerHeightValue) => {
    if (messages.length === 0) {
      return { start: 0, end: 0 };
    }

    let accumulatedHeight = 0;
    let start = 0;
    let end = messages.length - 1;

    // 시작 인덱스 찾기
    for (let i = 0; i < messages.length; i++) {
      const itemH = itemHeightsRef.current.get(i) || itemHeight;
      if (accumulatedHeight + itemH > scrollTopValue) {
        start = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += itemH;
    }

    // 끝 인덱스 찾기
    const visibleBottom = scrollTopValue + containerHeightValue;
    accumulatedHeight = 0;
    for (let i = start; i < messages.length; i++) {
      const itemH = itemHeightsRef.current.get(i) || itemHeight;
      accumulatedHeight += itemH;
      if (accumulatedHeight >= visibleBottom) {
        end = Math.min(messages.length - 1, i + overscan);
        break;
      }
    }

    return { start, end };
  }, [messages.length, itemHeight, overscan]);

  // 스크롤 핸들러
  const onScroll = useCallback((e) => {
    const el = e.target;
    if (!el) return;

    const newScrollTop = el.scrollTop;
    setScrollTop(newScrollTop);

    // 보이는 범위 재계산
    const range = calculateVisibleRange(newScrollTop, el.clientHeight);
    setVisibleRange(range);

    // 위로 스크롤하여 이전 메시지 로드 트리거
    if (newScrollTop < 100) {
      const event = new CustomEvent('loadPreviousMessages');
      el.dispatchEvent(event);
    }
  }, [calculateVisibleRange]);

  // 맨 아래로 스크롤
  const scrollToBottom = useCallback(() => {
    const el = containerRefRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, []);

  // 초기화 (방 변경 시)
  const reset = useCallback(() => {
    setVisibleRange({ start: 0, end: 0 });
    setScrollTop(0);
    itemHeightsRef.current.clear();
    totalHeightRef.current = 0;
    prevMessagesLengthRef.current = 0;
    prevLastMessageIdRef.current = null;
    isInitialMountRef.current = true;
  }, []);

  // 컨테이너 ref 설정 함수
  const setContainerRef = useCallback((ref) => {
    containerRefRef.current = ref;
    
    // 기존 ResizeObserver 정리
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    
    if (ref) {
      updateContainerHeight();
      // ResizeObserver로 컨테이너 크기 변경 감지
      if (window.ResizeObserver) {
        resizeObserverRef.current = new ResizeObserver(() => {
          updateContainerHeight();
        });
        resizeObserverRef.current.observe(ref);
      }
    }
  }, [updateContainerHeight]);

  // 메시지 변경 시 보이는 범위 재계산
  useEffect(() => {
    if (messages.length === 0) {
      setVisibleRange({ start: 0, end: 0 });
      return;
    }

    // 초기 마운트 시 최신 메시지부터 표시
    if (isInitialMountRef.current && messages.length > 0) {
      isInitialMountRef.current = false;
      const container = containerRefRef.current;
      if (container) {
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
          const range = calculateVisibleRange(container.scrollTop, container.clientHeight);
          setVisibleRange(range);
        });
      }
      prevMessagesLengthRef.current = messages.length;
      return;
    }

    // 새 메시지가 추가된 경우 (뒤에 추가)
    const prevLength = prevMessagesLengthRef.current;
    if (messages.length > prevLength) {
      const container = containerRefRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isNearBottom) {
          requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
            const range = calculateVisibleRange(container.scrollTop, container.clientHeight);
            setVisibleRange(range);
          });
        } else {
          const range = calculateVisibleRange(container.scrollTop, container.clientHeight);
          setVisibleRange(range);
        }
      }
    } else if (messages.length < prevLength) {
      // 메시지가 앞에 추가된 경우 (이전 메시지 로드)
      const container = containerRefRef.current;
      if (container) {
        const prevScrollHeight = container.scrollHeight;
        requestAnimationFrame(() => {
          const heightDiff = container.scrollHeight - prevScrollHeight;
          container.scrollTop = container.scrollTop + heightDiff;
          const range = calculateVisibleRange(container.scrollTop, container.clientHeight);
          setVisibleRange(range);
        });
      }
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, calculateVisibleRange, containerHeight]);

  // 스크롤 위치 변경 시 보이는 범위 업데이트
  useEffect(() => {
    if (containerHeight === 0) return;
    const range = calculateVisibleRange(scrollTop, containerHeight);
    setVisibleRange(range);
  }, [scrollTop, containerHeight, calculateVisibleRange]);

  // 보이는 메시지 추출
  const startIndex = visibleRange.start;
  const endIndex = visibleRange.end;
  const visibleMessages = messages.slice(startIndex, endIndex + 1);

  // 상단 패딩 계산
  let topPadding = 0;
  for (let i = 0; i < startIndex; i++) {
    topPadding += itemHeightsRef.current.get(i) || itemHeight;
  }

  // 하단 패딩 계산
  let bottomPadding = 0;
  for (let i = endIndex + 1; i < messages.length; i++) {
    bottomPadding += itemHeightsRef.current.get(i) || itemHeight;
  }

  // 항목 높이 측정 함수 (각 메시지 컴포넌트에서 호출)
  const measureItemHeight = useCallback((index, height) => {
    if (itemHeightsRef.current.get(index) !== height) {
      itemHeightsRef.current.set(index, height);
      calculateTotalHeight();
    }
  }, [calculateTotalHeight]);

  return {
    visibleMessages,
    startIndex,
    endIndex,
    topPadding,
    bottomPadding,
    onScroll,
    scrollToBottom,
    reset,
    setContainerRef,
    measureItemHeight,
  };
};

export default useInfiniteChat;
