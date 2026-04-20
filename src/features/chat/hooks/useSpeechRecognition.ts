import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechRecognition = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'zh-CN'; // 可以根据用户偏好动态设置

        recognitionRef.current.onresult = (event: any) => {
          let final = '';
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setTranscript(prev => prev + final);
          setInterimTranscript(interim);
        };

        recognitionRef.current.onerror = (event: any) => {
          // 拦截 "not-allowed" 权限拒绝错误，避免抛出红屏阻断应用
          if (event.error === 'not-allowed') {
            console.warn('【Web Speech API】麦克风权限被拒绝或被系统拦截');
          } else if (event.error === 'aborted') {
            // 当我们手动调用 recognition.abort() (比如用户向左滑取消) 时，
            // 浏览器底层引擎会派发一个 'aborted' 错误。
            // 这是一个预期的业务逻辑行为，不是真正的 Bug，必须静默拦截。
            console.log('【Web Speech API】识别被用户主动取消 (aborted)');
          } else {
            console.error('【Web Speech API】语音识别异常:', event.error);
          }
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setInterimTranscript('');
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const abortListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.abort();
      setIsListening(false);
      setTranscript('');
      setInterimTranscript('');
    }
  }, [isListening]);

  return {
    isSupported,
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    abortListening
  };
};
