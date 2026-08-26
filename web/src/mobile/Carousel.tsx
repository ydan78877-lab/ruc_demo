import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type PropsWithChildren,
} from "react";

export type CarouselProps = PropsWithChildren<{
  className?: string;
  contentClassName?: string;
  ariaLabel?: string;
  showScrollbar?: boolean;
  draggingEnabled?: boolean;
}>;

const physics = {
  friction: 2.1,
  velocityScale: 890,
  velocityTolerance: 18,
  bounceTension: 200,
  bounceFriction: 40,
  overdragScale: 0.5,
  maxOverdrag: 96,
  sampleWindow: 100,
  dragThreshold: 8,
} as const;

type Sample = { value: number; time: number };
type DragSession = {
  pointerId: number;
  startPrimary: number;
  startCross: number;
  startOffset: number;
  captured: boolean;
  dragged: boolean;
};

export function Carousel({
  className,
  contentClassName,
  ariaLabel,
  showScrollbar = false,
  draggingEnabled = true,
  children,
}: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const dragSamplesRef = useRef<Sample[]>([]);
  const inertiaFrameRef = useRef<number | null>(null);
  const overdragRef = useRef(0);
  const suppressNextClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [overdrag, setOverdrag] = useState(0);
  const [thumb, setThumb] = useState({ visible: false, offset: 0, size: 0 });

  const maxOffset = useCallback((node: HTMLDivElement) => Math.max(0, node.scrollWidth - node.clientWidth), []);

  const stopInertia = useCallback(() => {
    if (inertiaFrameRef.current !== null) window.cancelAnimationFrame(inertiaFrameRef.current);
    inertiaFrameRef.current = null;
  }, []);
  const setRubberBand = useCallback((value: number) => {
    const next = Math.max(-physics.maxOverdrag, Math.min(physics.maxOverdrag, value));
    overdragRef.current = next;
    setOverdrag(next);
  }, []);

  const updateThumb = useCallback((visible = true) => {
    if (!showScrollbar || !scrollRef.current) return;
    const node = scrollRef.current;
    const viewport = node.clientWidth;
    const content = node.scrollWidth;
    const enabled = content > viewport + 2;
    const size = enabled ? Math.max(36, (viewport / content) * viewport) : 0;
    const track = Math.max(0, viewport - size - 8);
    const progress = node.scrollLeft / Math.max(1, content - viewport);
    setThumb({ visible: visible && enabled, size, offset: enabled ? 4 + progress * track : 0 });
  }, [showScrollbar]);

  const springBack = useCallback((initialVelocity = 0) => {
    stopInertia();
    let position = overdragRef.current;
    let velocity = Math.max(-1400, Math.min(1400, initialVelocity));
    let previous: number | null = null;
    const tick = (time: number) => {
      const seconds = Math.min(0.034, ((previous === null ? 16 : time - previous) || 16) / 1000);
      previous = time;
      velocity += (-physics.bounceTension * position - physics.bounceFriction * velocity) * seconds;
      position += velocity * seconds;
      if (Math.abs(position) < 0.5 && Math.abs(velocity) < 0.5) {
        setRubberBand(0);
        inertiaFrameRef.current = null;
        return;
      }
      setRubberBand(position);
      inertiaFrameRef.current = window.requestAnimationFrame(tick);
    };
    inertiaFrameRef.current = window.requestAnimationFrame(tick);
  }, [setRubberBand, stopInertia]);

  const startMomentum = useCallback((node: HTMLDivElement, initialVelocity: number) => {
    let velocity = initialVelocity;
    let previous: number | null = null;
    const tick = (time: number) => {
      const seconds = (previous === null ? 16 : Math.min(34, time - previous)) / 1000;
      previous = time;
      velocity *= Math.exp(-physics.friction * seconds);
      if (Math.abs(velocity) < physics.velocityTolerance) {
        inertiaFrameRef.current = null;
        updateThumb(true);
        return;
      }
      const next = node.scrollLeft + velocity * seconds;
      const maximum = maxOffset(node);
      if (next < 0 || next > maximum) {
        node.scrollLeft = Math.max(0, Math.min(maximum, next));
        // Match MobileScroll's edge convention: positive displacement at the
        // leading edge, negative displacement at the trailing edge.
        setRubberBand((next < 0 ? -next : maximum - next) * physics.overdragScale);
        springBack(velocity * physics.overdragScale);
        return;
      }
      node.scrollLeft = next;
      updateThumb(true);
      inertiaFrameRef.current = window.requestAnimationFrame(tick);
    };
    if (Math.abs(velocity) >= physics.velocityTolerance) inertiaFrameRef.current = window.requestAnimationFrame(tick);
  }, [maxOffset, setRubberBand, springBack, updateThumb]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const onScroll = () => updateThumb(true);
    const observer = new ResizeObserver(() => updateThumb(false));
    node.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    updateThumb(false);
    return () => {
      node.removeEventListener("scroll", onScroll);
      observer.disconnect();
      stopInertia();
    };
  }, [stopInertia, updateThumb]);

  const pushDragSample = (value: number) => {
    const time = performance.now();
    dragSamplesRef.current = [...dragSamplesRef.current, { value, time }].filter((sample) => time - sample.time <= physics.sampleWindow);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = scrollRef.current;
    if (!draggingEnabled || !node || maxOffset(node) <= 2 || (event.pointerType === "mouse" && event.button !== 0)) return;
    stopInertia();
    dragSamplesRef.current = [];
    // 每次手势起始复位，让被 pointercancel 打断、因而没有 click 跟随的上一次手势不会吞掉下一次点击。
    suppressNextClickRef.current = false;
    pushDragSample(event.clientX);
    setRubberBand(0);
    dragSessionRef.current = { pointerId: event.pointerId, startPrimary: event.clientX, startCross: event.clientY, startOffset: node.scrollLeft, captured: false, dragged: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = scrollRef.current;
    const session = dragSessionRef.current;
    if (!node || !session || session.pointerId !== event.pointerId) return;
    const delta = event.clientX - session.startPrimary;
    const crossDelta = event.clientY - session.startCross;
    if (!session.dragged) {
      // Keep the gesture pending until it clears tap slop. Pointer-down and
      // these early moves must bubble so a parent MobileScroll can still win.
      if (Math.max(Math.abs(delta), Math.abs(crossDelta)) < physics.dragThreshold) return;
      if (Math.abs(crossDelta) > Math.abs(delta)) {
        // The cross axis won. Abandon this session without capturing or
        // canceling the event so the parent can handle this move and release.
        dragSessionRef.current = null;
        return;
      }
      // The scroller owns the gesture from this move onward. Capture keeps
      // delivery stable outside its bounds; stopping propagation prevents the
      // parent from accumulating vertical drift or release momentum.
      event.currentTarget.setPointerCapture(event.pointerId);
      session.captured = true;
    }
    event.preventDefault();
    event.stopPropagation();
    session.dragged = true;
    setDragging(true);
    suppressNextClickRef.current = true;
    pushDragSample(event.clientX);
    const desired = session.startOffset - delta;
    const maximum = maxOffset(node);
    node.scrollLeft = Math.max(0, Math.min(maximum, desired));
    setRubberBand(desired < 0 ? -desired * physics.overdragScale : desired > maximum ? -(desired - maximum) * physics.overdragScale : 0);
    updateThumb(true);
  };

  const finish = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = scrollRef.current;
    const session = dragSessionRef.current;
    if (!node || !session || session.pointerId !== event.pointerId) return;
    if (session.captured) event.currentTarget.releasePointerCapture(event.pointerId);
    const samples = dragSamplesRef.current;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const velocity = first && last ? -((last.value - first.value) / Math.max(1, last.time - first.time)) * physics.velocityScale : 0;
    dragSessionRef.current = null;
    setDragging(false);
    if (session.dragged) event.preventDefault();
    if (Math.abs(overdragRef.current) > 0.1) springBack(velocity * physics.overdragScale);
    else startMomentum(node, velocity);
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressNextClickRef.current) return;
    suppressNextClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const style = { "--mobile-carousel-overdrag": `${overdrag}px` } as CSSProperties;
  const thumbStyle = { width: thumb.size, transform: `translateX(${thumb.offset}px)` };

  return (
    <div
      ref={scrollRef}
      className={`mobile-carousel ${className ?? ""}`}
      data-dragging={dragging}
      data-overscroll={overdrag.toFixed(2)}
      aria-label={ariaLabel}
      role={ariaLabel ? "region" : undefined}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onClickCapture={onClickCapture}
    >
      <div className={`mobile-carousel-content ${contentClassName ?? ""}`}>{children}</div>
      {showScrollbar ? (
        <div className="mobile-carousel-scrollbar" data-visible={thumb.visible} aria-hidden="true">
          <div className="mobile-carousel-scrollbar-thumb" style={thumbStyle} />
        </div>
      ) : null}
    </div>
  );
}
