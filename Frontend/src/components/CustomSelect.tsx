import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { gsap } from 'gsap';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  variant?: 'default' | 'compact';
}

export function CustomSelect({ options, value, onChange, className = '', placeholder = "Select option", variant = 'default' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      gsap.fromTo(dropdownRef.current, 
        { 
          opacity: 0, 
          y: -10, 
          scaleY: 0.9, 
          transformOrigin: "top" 
        }, 
        { 
          opacity: 1, 
          y: 0, 
          scaleY: 1, 
          duration: 0.2, 
          ease: "back.out(1.5)" 
        }
      );
    }
  }, [isOpen]);

  const handleToggle = () => setIsOpen(prev => !prev);
  const handleSelect = (val: string) => {
    if (dropdownRef.current) {
      gsap.to(dropdownRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.15,
        ease: "power2.in",
        onComplete: () => {
          onChange(val);
          setIsOpen(false);
        }
      });
    } else {
      onChange(val);
      setIsOpen(false);
    }
  };

  const getBaseClasses = () => {
    if (variant === 'compact') {
      return "w-full glass-select-compact flex items-center justify-between transition-all cursor-pointer group";
    }
    return "w-full flex items-center justify-between px-6 py-4 text-[15px] font-bold text-gray-900 transition-all cursor-pointer group rounded-2xl border border-white/40";
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        onClick={handleToggle}
        className={getBaseClasses()}
        style={{ 
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(var(--glass-blur)) saturate(210%)', 
          WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(210%)',
          boxShadow: 'var(--glass-shadow)'
        }}
      >
        <span className="truncate opacity-90">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={variant === 'compact' ? 14 : 18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : 'text-blue-900/40 group-hover:text-blue-500'}`} />
      </div>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 glass-card rounded-2xl overflow-hidden py-1.5"
          style={{ 
            boxShadow: 'var(--glass-shadow)', 
            backdropFilter: 'blur(var(--glass-blur)) saturate(210%)',
            WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(210%)'
          }}
        >
          {options.map((opt, index) => (
            <div
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              onMouseEnter={(e) => {
                const label = e.currentTarget.querySelector('span');
                if (label) {
                  gsap.to(label, { x: 4, duration: 0.2, ease: 'power2.out' });
                }
              }}
              onMouseLeave={(e) => {
                const label = e.currentTarget.querySelector('span');
                if (label) {
                  gsap.to(label, { x: 0, duration: 0.2, ease: 'power2.out' });
                }
              }}
              className={`mx-1.5 rounded-xl px-4 ${variant === 'compact' ? 'py-2 text-[14px]' : 'py-3 text-[15px]'} font-bold cursor-pointer transition-all duration-200
                ${value === opt.value ? 'text-blue-700 bg-blue-500/10' : 'text-gray-700'} hover:bg-black/5 hover:text-blue-700
              `}
            >
              <span className="inline-block">{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
