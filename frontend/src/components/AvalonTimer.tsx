import React, { useState, useRef, useEffect } from "react";
import { BiChevronUp, BiChevronDown, BiPlayCircle, BiPauseCircle, BiRevision, BiSolidGrid } from "react-icons/bi";

interface AvalonTimerProps {
  timerDefault: number;
  setTimerDefault: (val: number) => void;
  autoRestartKey?: any; // change this value to auto-restart timer
  onTimerEnd?: () => void;
}

const AvalonTimer: React.FC<AvalonTimerProps> = ({ timerDefault, setTimerDefault, autoRestartKey, onTimerEnd }) => {
  const [timer, setTimer] = useState<number>(timerDefault);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerStartedOnce, setTimerStartedOnce] = useState<boolean>(false);
  const [timerPos, setTimerPos] = useState<{ x: number; y: number }>({ x: window.innerWidth - 255, y: 65 });
  const [dragging, setDragging] = useState<boolean>(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const timerRef = useRef<HTMLDivElement>(null);

  // For chevron controls
  const handleAddMinute = () => {
    setTimer(t => {
      const newTime = t + 60;
      setTimerDefault(newTime);
      return newTime;
    });
  };
  const handleSubtractMinute = () => {
    setTimer(t => {
      const newTime = t >= 60 ? t - 60 : 0;
      setTimerDefault(newTime);
      return newTime;
    });
  };

  // Play a sine wave beep when timer reaches 0
  const playBeep = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    oscillator.connect(ctx.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      ctx.close();
    }, 2000);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev === 1) {
            playBeep();
            if (onTimerEnd) onTimerEnd();
          }
          return prev > 0 ? prev - 1 : 0;
        });
      }, 1000);
    } else if (!timerActive && interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timer, onTimerEnd]);

  // Auto-restart timer when autoRestartKey changes (e.g., round id)
  const prevAutoRestartKey = useRef<any>(null);
  useEffect(() => {
    if (timerStartedOnce && autoRestartKey !== undefined) {
      if (prevAutoRestartKey.current !== autoRestartKey) {
        setTimer(timerDefault);
        setTimerActive(true);
      }
      prevAutoRestartKey.current = autoRestartKey;
    }
    if (autoRestartKey === undefined) {
      prevAutoRestartKey.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRestartKey, timerDefault, timerStartedOnce]);

  const handleTimerStart = () => {
    if (timer === 0) setTimer(timerDefault);
    setTimerActive(true);
    setTimerStartedOnce(true);
  };
  const handleTimerStop = () => setTimerActive(false);
  const handleTimerReset = () => {
    setTimerActive(false);
    setTimer(timerDefault);
  };
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(1, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true);
    const rect = timerRef.current?.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0)
    };
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setTimerPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      });
    };
    const handleMouseUp = () => {
      setDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  return (
    <div
      ref={timerRef}
      style={{
        position: "fixed",
        left: timerPos.x,
        top: timerPos.y,
        zIndex: 9999,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        background: "#222",
        borderRadius: "8px",
        padding: "8px 12px"
      }}
      onMouseDown={handleDragStart}
    >
      <div className="d-flex align-items-center">
        <button className="btn btn-outline-light border-0 px-0 disabled">
          <BiSolidGrid size={18} />
        </button>
        <div className="d-flex align-items-center me-2">
          <div className="d-flex flex-column align-items-center justify-content-center me-2">
            <div className="d-flex flex-column justify-content-center" style={{ height: '32px' }}>
              <button className="btn btn-outline-secondary btn-sm p-0 border-0" style={{ height: '16px', width: '28px', minWidth: '28px', lineHeight: 1 }} onClick={handleAddMinute} aria-label="Add minute">
                <BiChevronUp size={14} color="currentColor" />
              </button>
              <button className="btn btn-outline-secondary btn-sm p-0 border-0" style={{ height: '16px', width: '28px', minWidth: '28px', lineHeight: 1 }} onClick={handleSubtractMinute} aria-label="Subtract minute">
                <BiChevronDown size={14} color="currentColor" />
              </button>
            </div>
          </div>
          <span className="btn btn-outline-secondary text-light btn" style={{ pointerEvents: "none" }}>{formatTimer(timer)}</span>
        </div>
        <button className="btn btn-outline-light btn-sm border-0" onClick={handleTimerStart} disabled={timerActive && timer > 0}>
          <BiPlayCircle size={18} />
        </button>
        <button className="btn btn-outline-light btn-sm border-0" onClick={handleTimerStop} disabled={!timerActive}>
          <BiPauseCircle size={18} />
        </button>
        <button className="btn btn-outline-light btn-sm border-0" onClick={handleTimerReset}>
          <BiRevision size={18} />
        </button>
      </div>
    </div>
  );
};

export default AvalonTimer;
