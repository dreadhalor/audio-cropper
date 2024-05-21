import { P5CanvasInstance } from '@p5-wrapper/react';
import {
  progressColor,
  selectionColor,
  waveColor,
  viewWindowColor,
  viewWindowHandleColor,
} from './constants';
import { AudioContextValue } from './audio-provider';

type MinimapProps = P5CanvasInstance<AudioContextValue> & {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  visibleStartTime: number;
  visibleEndTime: number;
  onBoundsChange?: (start: number, end: number) => void;
};

export const MinimapSketch = (p5: MinimapProps) => {
  let audioBuffer: AudioBuffer | null = null;
  let currentTime: number = 0;
  let visibleStartTime: number = 0;
  let visibleEndTime: number = 0;
  let onBoundsChange: ((start: number, end: number) => void) | undefined;
  let isDraggingWindow = false;
  let isDraggingStartHandle = false;
  let isDraggingEndHandle = false;
  let dragOffset = 0;
  let windowWidth = 0;

  p5.updateWithProps = (props: any) => {
    if (props.audioBuffer) audioBuffer = props.audioBuffer;
    if (props.currentTime !== undefined) currentTime = props.currentTime;
    if (props.visibleStartTime !== undefined)
      visibleStartTime = props.visibleStartTime;
    if (props.visibleEndTime !== undefined)
      visibleEndTime = props.visibleEndTime;
    if (props.onBoundsChange) onBoundsChange = props.onBoundsChange;
  };

  p5.setup = () => {
    p5.createCanvas(500, 100);
  };

  p5.draw = () => {
    if (audioBuffer) {
      drawMinimap(p5, audioBuffer);
    }
  };

  const drawMinimap = (p: MinimapProps, buffer: AudioBuffer) => {
    const width = p.width;
    const height = p.height;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    p.background(0);
    p.strokeWeight(1);

    // Draw waveform lines before and after the playhead
    const absoluteProgress = (currentTime / buffer.duration) * width;
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j];
        if (datum < min) {
          min = datum;
        }
        if (datum > max) {
          max = datum;
        }
      }
      if (i < absoluteProgress) {
        p.stroke(progressColor);
      } else {
        p.stroke(waveColor);
      }
      p.line(i, (1 + min) * amp, i, (1 + max) * amp);
    }

    // Draw playhead
    p.stroke(progressColor);
    p.line(absoluteProgress, 0, absoluteProgress, height);

    // Draw visible window
    p.fill(viewWindowColor);
    p.noStroke();
    const startX = (visibleStartTime / buffer.duration) * width;
    const endX = (visibleEndTime / buffer.duration) * width;
    windowWidth = endX - startX;
    p.rect(startX, 0, windowWidth, height);

    // Draw selection handles
    p.fill(viewWindowHandleColor);
    const handleSize = 4;
    p.rect(startX - handleSize / 2, 0, handleSize, height);
    p.rect(endX - handleSize / 2, 0, handleSize, height);
  };

  p5.mousePressed = () => {
    if (
      audioBuffer &&
      p5.mouseX >= 0 &&
      p5.mouseX <= p5.width &&
      p5.mouseY >= 0 &&
      p5.mouseY <= p5.height
    ) {
      const handleSize = 10;
      const startX = (visibleStartTime / audioBuffer.duration) * p5.width;
      const endX = (visibleEndTime / audioBuffer.duration) * p5.width;

      if (Math.abs(p5.mouseX - startX) < handleSize) {
        isDraggingStartHandle = true;
      } else if (Math.abs(p5.mouseX - endX) < handleSize) {
        isDraggingEndHandle = true;
      } else if (p5.mouseX > startX && p5.mouseX < endX) {
        isDraggingWindow = true;
        dragOffset = p5.mouseX - startX;
      }
    }
  };

  p5.mouseDragged = () => {
    if (isDraggingWindow && audioBuffer && onBoundsChange) {
      let newStartX = p5.mouseX - dragOffset;
      newStartX = Math.max(0, Math.min(newStartX, p5.width - windowWidth));
      const newStartTime = (newStartX / p5.width) * audioBuffer.duration;
      const newEndTime =
        newStartTime +
        ((visibleEndTime - visibleStartTime) / audioBuffer.duration) *
          audioBuffer.duration;
      onBoundsChange(newStartTime, newEndTime);
    } else if (isDraggingStartHandle && audioBuffer && onBoundsChange) {
      const newStartX = Math.max(0, Math.min(p5.mouseX, p5.width));
      const newStartTime = (newStartX / p5.width) * audioBuffer.duration;
      if (newStartTime < visibleEndTime) {
        onBoundsChange(newStartTime, visibleEndTime);
      }
    } else if (isDraggingEndHandle && audioBuffer && onBoundsChange) {
      const newEndX = Math.max(0, Math.min(p5.mouseX, p5.width));
      const newEndTime = (newEndX / p5.width) * audioBuffer.duration;
      if (newEndTime > visibleStartTime) {
        onBoundsChange(visibleStartTime, newEndTime);
      }
    }
  };

  p5.mouseReleased = () => {
    isDraggingWindow = false;
    isDraggingStartHandle = false;
    isDraggingEndHandle = false;
  };
};
