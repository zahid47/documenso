'use client';

import {
  HTMLAttributes,
  MouseEvent,
  PointerEvent,
  TouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { StrokeOptions, getStroke } from 'perfect-freehand';

import { cn } from '@documenso/ui/lib/utils';

import { getSvgPathFromStroke } from './helper';
import { Point } from './point';

const DPI = 2;

export type SignaturePadProps = Omit<HTMLAttributes<HTMLCanvasElement>, 'onChange'> & {
  onChange?: (_signatureDataUrl: string | null) => void;
};

export const SignaturePad = ({
  className,
  defaultValue,
  onChange,
  ...props
}: SignaturePadProps) => {
  const $el = useRef<HTMLCanvasElement>(null);

  const [isPressed, setIsPressed] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  const perfectFreehandOptions = useMemo(() => {
    const size = $el.current ? Math.min($el.current.height, $el.current.width) * 0.03 : 10;

    return {
      size,
      thinning: 0.25,
      streamline: 0.5,
      smoothing: 0.5,
      end: {
        taper: size * 2,
      },
    } satisfies StrokeOptions;
  }, []);

  const onMouseDown = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    setIsPressed(true);

    const point = Point.fromEvent(event, DPI, $el.current);

    const newPoints = [...points, point];

    setPoints(newPoints);

    if ($el.current) {
      const ctx = $el.current.getContext('2d');

      if (ctx) {
        ctx.save();

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const pathData = new Path2D(
          getSvgPathFromStroke(getStroke(newPoints, perfectFreehandOptions)),
        );

        ctx.fill(pathData);
      }
    }
  };

  const onMouseMove = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    if (!isPressed) {
      return;
    }

    const point = Point.fromEvent(event, DPI, $el.current);

    if (point.distanceTo(points[points.length - 1]) > 5) {
      const newPoints = [...points, point];

      setPoints(newPoints);

      if ($el.current) {
        const ctx = $el.current.getContext('2d');

        if (ctx) {
          ctx.restore();

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          const pathData = new Path2D(
            getSvgPathFromStroke(getStroke(points, perfectFreehandOptions)),
          );

          ctx.fill(pathData);
        }
      }
    }
  };

  const onMouseUp = (event: MouseEvent | PointerEvent | TouchEvent, addPoint = true) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    setIsPressed(false);

    const point = Point.fromEvent(event, DPI, $el.current);

    const newPoints = [...points];

    if (addPoint) {
      newPoints.push(point);

      setPoints(newPoints);
    }

    if ($el.current && newPoints.length > 0) {
      const ctx = $el.current.getContext('2d');

      if (ctx) {
        ctx.restore();

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const pathData = new Path2D(
          getSvgPathFromStroke(getStroke(newPoints, perfectFreehandOptions)),
        );

        ctx.fill(pathData);

        ctx.save();
      }

      const dataURL = $el.current.toDataURL();

      onChange?.(dataURL);
      setHistory((prev) => [...prev, dataURL]);
    }

    setPoints([]);
  };

  const onMouseEnter = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    if ('buttons' in event && event.buttons === 1) {
      onMouseDown(event);
    }
  };

  const onMouseLeave = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    onMouseUp(event, false);
  };

  const onClearClick = () => {
    if ($el.current) {
      const ctx = $el.current.getContext('2d');

      ctx?.clearRect(0, 0, $el.current.width, $el.current.height);
    }

    onChange?.(null);

    setPoints([]);
  };

  const onUndoClick = () => {
    const newHistory = [...history];
    newHistory.pop();
    setHistory(newHistory);

    const undoDataURL = newHistory[newHistory.length - 1] ?? defaultValue;

    onChange?.(undoDataURL);
  };

  useEffect(() => {
    if ($el.current) {
      $el.current.width = $el.current.clientWidth * DPI;
      $el.current.height = $el.current.clientHeight * DPI;
    }
  }, []);

  useEffect(() => {
    if ($el.current && typeof defaultValue === 'string') {
      const ctx = $el.current.getContext('2d');

      const { width, height } = $el.current;

      const img = new Image();

      img.onload = () => {
        ctx?.drawImage(img, 0, 0, Math.min(width, img.width), Math.min(height, img.height));
      };

      img.src = defaultValue;
    }
  }, [defaultValue]);

  return (
    <div className="relative block">
      <canvas
        ref={$el}
        className={cn('relative block dark:invert', className)}
        style={{ touchAction: 'none' }}
        onPointerMove={(event) => onMouseMove(event)}
        onPointerDown={(event) => onMouseDown(event)}
        onPointerUp={(event) => onMouseUp(event)}
        onPointerLeave={(event) => onMouseLeave(event)}
        onPointerEnter={(event) => onMouseEnter(event)}
        {...props}
      />

      <div className="absolute bottom-4 right-4 space-x-2">
        {Boolean(history.length) && (
          <button
            type="button"
            className="focus-visible:ring-ring ring-offset-background rounded-full p-0 text-xs text-slate-500 focus-visible:outline-none focus-visible:ring-2"
            onClick={() => onUndoClick()}
          >
            Undo
          </button>
        )}
        <button
          type="button"
          className="focus-visible:ring-ring ring-offset-background rounded-full p-0 text-xs text-slate-500 focus-visible:outline-none focus-visible:ring-2"
          onClick={() => onClearClick()}
        >
          Clear Signature
        </button>
      </div>
    </div>
  );
};
