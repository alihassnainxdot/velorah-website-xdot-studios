import { liquidMetalFragmentShader, ShaderMount } from '@paper-design/shaders';
import { Sparkles } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface LiquidMetalButtonProps {
  label?: string;
  onClick?: () => void;
  viewMode?: 'text' | 'icon';
  size?: 'default' | 'lg';
  className?: string;
}

export function getLiquidMetalDimensions(
  viewMode: 'text' | 'icon',
  size: 'default' | 'lg'
) {
  if (viewMode === 'icon') {
    const dim = size === 'lg' ? 56 : 46;
    return {
      width: dim,
      height: dim,
      innerWidth: dim - 4,
      innerHeight: dim - 4,
      shaderWidth: dim,
      shaderHeight: dim,
      fontSize: 16,
    };
  }

  if (size === 'lg') {
    return {
      width: 196,
      height: 58,
      innerWidth: 190,
      innerHeight: 52,
      shaderWidth: 196,
      shaderHeight: 58,
      fontSize: 16,
    };
  }

  return {
    width: 142,
    height: 46,
    innerWidth: 138,
    innerHeight: 42,
    shaderWidth: 142,
    shaderHeight: 46,
    fontSize: 14,
  };
}

export function LiquidMetalButton({
  label = 'Get Started',
  onClick,
  viewMode = 'text',
  size = 'default',
  className,
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const shaderRef = useRef<HTMLDivElement>(null);
  const shaderMount = useRef<ShaderMount | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isHoveredRef = useRef(false);
  const rippleId = useRef(0);

  const dimensions = useMemo(() => getLiquidMetalDimensions(viewMode, size), [viewMode, size]);

  useEffect(() => {
    const styleId = 'shader-canvas-style-exploded';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .shader-container-exploded canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: 100px !important;
        }
        @keyframes ripple-animation {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const baseSpeed = prefersReducedMotion ? 0 : 0.6;

    try {
      if (shaderRef.current) {
        if (shaderMount.current) {
          shaderMount.current.dispose();
          shaderMount.current = null;
        }

        shaderMount.current = new ShaderMount(
          shaderRef.current,
          liquidMetalFragmentShader,
          {
            u_repetition: 4,
            u_softness: 0.5,
            u_shiftRed: 0.3,
            u_shiftBlue: 0.3,
            u_distortion: 0,
            u_contour: 0,
            u_angle: 45,
            u_scale: 8,
            u_shape: 1,
            u_offsetX: 0.1,
            u_offsetY: -0.1,
          },
          undefined,
          baseSpeed
        );
      }
    } catch (error) {
      console.error('Failed to initialize liquid metal shader:', error);
    }

    return () => {
      if (shaderMount.current) {
        shaderMount.current.dispose();
        shaderMount.current = null;
      }
    };
  }, []);

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    setIsHovered(true);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shaderMount.current?.setSpeed(1);
    }
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    setIsHovered(false);
    setIsPressed(false);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shaderMount.current?.setSpeed(0.6);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (shaderMount.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shaderMount.current.setSpeed(2.4);
      window.setTimeout(() => {
        shaderMount.current?.setSpeed(isHoveredRef.current ? 1 : 0.6);
      }, 300);
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = { x, y, id: rippleId.current++ };

      setRipples((prev) => [...prev, ripple]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
      }, 600);
    }

    onClick?.();
  };

  return (
    <div
      className={cn(
        'relative inline-block transition-transform duration-200 hover:scale-[1.03]',
        className
      )}
    >
      <div
        style={{
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            transformStyle: 'preserve-3d',
            transition:
              'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease',
            transform: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transformStyle: 'preserve-3d',
              transition:
                'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease, gap 0.4s ease',
              transform: 'translateZ(20px)',
              zIndex: 30,
              pointerEvents: 'none',
            }}
          >
            {viewMode === 'icon' && (
              <Sparkles
                size={16}
                style={{
                  color: isHovered ? '#ffffff' : '#e4e4e7',
                  filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.5))',
                  transition: 'color 0.2s ease, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: 'scale(1)',
                }}
              />
            )}
            {viewMode === 'text' && (
              <span
                style={{
                  fontSize: `${dimensions.fontSize}px`,
                  color: isHovered ? '#ffffff' : '#e4e4e7',
                  fontWeight: 500,
                  textShadow: '0px 1px 2px rgba(0, 0, 0, 0.5)',
                  transition: 'color 0.2s ease, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: 'scale(1)',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            )}
          </div>

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              transformStyle: 'preserve-3d',
              transition:
                'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease',
              transform: `translateZ(10px) ${
                isPressed ? 'translateY(1px) scale(0.98)' : 'translateY(0) scale(1)'
              }`,
              zIndex: 20,
            }}
          >
            <div
              style={{
                width: `${dimensions.innerWidth}px`,
                height: `${dimensions.innerHeight}px`,
                margin: size === 'lg' ? '3px' : '2px',
                borderRadius: '100px',
                background: 'linear-gradient(180deg, #202020 0%, #000000 100%)',
                boxShadow: isPressed
                  ? 'inset 0px 2px 4px rgba(0, 0, 0, 0.4), inset 0px 1px 2px rgba(0, 0, 0, 0.3)'
                  : 'none',
                transition:
                  'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              transformStyle: 'preserve-3d',
              transition:
                'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease',
              transform: `translateZ(0px) ${
                isPressed ? 'translateY(1px) scale(0.98)' : 'translateY(0) scale(1)'
              }`,
              zIndex: 10,
            }}
          >
            <div
              style={{
                height: `${dimensions.height}px`,
                width: `${dimensions.width}px`,
                borderRadius: '100px',
                boxShadow: isPressed
                  ? '0px 0px 0px 1px rgba(0, 0, 0, 0.5), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)'
                  : isHovered
                    ? '0px 0px 0px 1px rgba(0, 0, 0, 0.4), 0px 12px 6px 0px rgba(0, 0, 0, 0.05), 0px 8px 5px 0px rgba(0, 0, 0, 0.1), 0px 4px 4px 0px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.2)'
                    : '0px 0px 0px 1px rgba(0, 0, 0, 0.3), 0px 36px 14px 0px rgba(0, 0, 0, 0.02), 0px 20px 12px 0px rgba(0, 0, 0, 0.08), 0px 9px 9px 0px rgba(0, 0, 0, 0.12), 0px 2px 5px 0px rgba(0, 0, 0, 0.15)',
                transition:
                  'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(160,160,170,0.12) 100%)',
              }}
            >
              <div
                ref={shaderRef}
                className="shader-container-exploded"
                style={{
                  borderRadius: '100px',
                  overflow: 'hidden',
                  position: 'relative',
                  width: `${dimensions.shaderWidth}px`,
                  maxWidth: `${dimensions.shaderWidth}px`,
                  height: `${dimensions.shaderHeight}px`,
                  transition: 'width 0.4s ease, height 0.4s ease',
                }}
              />
            </div>
          </div>

          <button
            ref={buttonRef}
            type="button"
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              outline: 'none',
              zIndex: 40,
              transformStyle: 'preserve-3d',
              transform: 'translateZ(25px)',
              transition:
                'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease',
              overflow: 'hidden',
              borderRadius: '100px',
            }}
            aria-label={label}
          >
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                style={{
                  position: 'absolute',
                  left: `${ripple.x}px`,
                  top: `${ripple.y}px`,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 70%)',
                  pointerEvents: 'none',
                  animation: 'ripple-animation 0.6s ease-out',
                }}
              />
            ))}
          </button>
        </div>
      </div>
    </div>
  );
}
