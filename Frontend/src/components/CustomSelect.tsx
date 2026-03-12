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
      return "w-full bg-blue-50/50 backdrop-blur-md border border-blue-100/60 rounded-xl px-4 py-2 flex items-center justify-between text-[15px] font-black text-blue-800 focus:outline-none focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer hover:bg-blue-50/80 shadow-sm";
    }
    return "w-full bg-white/70 backdrop-blur-md border border-gray-100 shadow-sm hover:shadow-md rounded-2xl px-6 py-4 flex items-center justify-between text-[15px] font-bold text-gray-900 focus:outline-none focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 transition-all cursor-pointer group";
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        onClick={handleToggle}
        className={getBaseClasses()}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={variant === 'compact' ? 14 : 18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} />
      </div>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60/90 backdrop-blur-2xl border border-gray-100 shadow-[0_15px_40px_-5px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden py-1.5"
        >
          {options.map((opt, index) => (
            <div
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              onMouseEnter={(e) => {
                gsap.to(e.currentTarget, { backgroundColor: 'rgba(59, 130, 246, 0.08)', x: 4, duration: 0.2 });
              }}
              onMouseLeave={(e) => {
                gsap.to(e.currentTarget, { backgroundColor: 'transparent', x: 0, duration: 0.2 });
              }}
              className={`px-4 ${variant === 'compact' ? 'py-1.5 text-[14px]' : 'py-2.5 text-[15px]'} font-bold cursor-pointer transition-colors
                ${value === opt.value ? 'bg-blue-50/50 text-blue-700' : 'text-gray-700 hover:text-gray-900'}
              `}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
