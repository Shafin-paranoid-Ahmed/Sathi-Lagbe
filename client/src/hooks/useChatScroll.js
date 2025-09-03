import { useState, useRef, useCallback, useEffect } from 'react';

export const useChatScroll = (messages, selectedChat) => {
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const previousMessageCount = useRef(0);
  const isInitialScroll = useRef(true);

  // Handle scroll events to detect user behavior
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    const nearBottom = distanceFromBottom < 50;
    setIsNearBottom(nearBottom);
    
    if (scrollTop < scrollHeight - clientHeight - 200) {
      setUserHasScrolledUp(true);
    } else if (nearBottom) {
      setUserHasScrolledUp(false);
    }
  }, []);

  // Track new messages and handle scroll behavior
  useEffect(() => {
    if (messages && messages.length > 0) {
      const isNewMessage = messages.length > previousMessageCount.current;
      
      if (isNewMessage && userHasScrolledUp) {
        setNewMessagesCount(prev => prev + 1);
      } else if (isNewMessage && isNearBottom && !userHasScrolledUp) {
        // Auto-scroll to newest message (but don't fight the user)
        const el = messagesContainerRef.current;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        if (atBottom) el.scrollTop = el.scrollHeight;
        setNewMessagesCount(0);
      } else if (isInitialScroll.current && messages.length <= 10) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        isInitialScroll.current = false;
      }
      
      previousMessageCount.current = messages.length;
    }
  }, [messages, isNearBottom, userHasScrolledUp]);

  // When a new chat is selected, scroll to latest message
  useEffect(() => {
    if (selectedChat && messages && messages.length > 0) {
      setUserHasScrolledUp(false);
      setIsNearBottom(true);
      setNewMessagesCount(0);
      previousMessageCount.current = messages.length;
      isInitialScroll.current = true;
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [selectedChat, messages?.length]);

  return {
    userHasScrolledUp,
    setUserHasScrolledUp,
    isNearBottom,
    newMessagesCount,
    setNewMessagesCount,
    messagesContainerRef,
    messagesEndRef,
    handleScroll
  };
};
