import { useState, useRef, useEffect } from 'react';
import { Play, Square } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration: number;
}

export const VoiceMessagePlayer = ({ audioUrl, duration }: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // 重置进度
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div 
      className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 cursor-pointer hover:bg-white/10 transition-colors"
      onClick={togglePlay}
    >
      {/* 隐藏的真实 Audio 标签 */}
      <audio ref={audioRef} src={audioUrl} />

      {/* 播放/停止按钮 */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isPlaying ? ' ' : 'bg-white/10 text-white/70'}`}>
        {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
      </div>

      {/* 赛博假波形 (可根据时长做不同宽度) */}
      <div className="flex items-center gap-1 opacity-70">
        <div className={`w-1  rounded-full ${isPlaying ? 'animate-pulse h-4' : 'h-2'}`} />
        <div className={`w-1  rounded-full ${isPlaying ? 'animate-pulse delay-75 h-6' : 'h-3'}`} />
        <div className={`w-1  rounded-full ${isPlaying ? 'animate-pulse delay-150 h-3' : 'h-2'}`} />
        <div className={`w-1  rounded-full ${isPlaying ? 'animate-pulse delay-300 h-5' : 'h-4'}`} />
        <div className={`w-1  rounded-full ${isPlaying ? 'animate-pulse h-2' : 'h-1'}`} />
      </div>

      {/* 时长显示 */}
      <span className="text-sm font-mono  ml-2 font-bold tracking-wider">
        {duration}″
      </span>
    </div>
  );
};