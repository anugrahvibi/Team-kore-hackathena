import React, { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const useGsapAnimations = (containerRef: React.RefObject<HTMLElement | null>, deps: any[] = []) => {
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. Button Hover/Click Animations (Persistent logic)
      const buttons = containerRef.current?.querySelectorAll('button') || [];
      buttons.forEach(btn => {
        const button = btn as HTMLButtonElement;
        
        const enter = () => {
          gsap.to(button, {
            scale: 1.04,
            duration: 0.15,
            ease: 'power2.out',
            boxShadow: '0 8px 20px -5px rgba(37, 99, 235, 0.25)'
          });
        };

        const leave = () => {
          gsap.to(button, {
            scale: 1,
            duration: 0.15,
            ease: 'power2.inOut',
            boxShadow: 'none',
            clearProps: "scale,boxShadow"
          });
        };

        button.addEventListener('mouseenter', enter);
        button.addEventListener('mouseleave', leave);
        
        return () => {
          button.removeEventListener('mouseenter', enter);
          button.removeEventListener('mouseleave', leave);
        };
      });

      // 2. Scroll Triggered Entrance Animations for Cards
      // We use a small stagger and scroll trigger for premium feel
      const cards = containerRef.current?.querySelectorAll('.glass-card, .glass-red, .glass-blue, .glass-amber, .glass-emerald, .glass-orange, .timeline-item, .alert-card-gsap, .gsap-appear') || [];
      
      if (cards.length > 0) {
        gsap.from(cards, {
          y: 25,
          opacity: 0,
          scale: 0.98,
          duration: 0.8,
          stagger: {
            amount: 0.3,
            ease: "power2.out"
          },
          ease: 'expo.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
            once: true // Only animate once to prevent annoying re-animations on scroll
          },
          immediateRender: false
        });
      }

      // 3. Header/Title Entrance
      const headers = containerRef.current?.querySelectorAll('header, .gsap-header') || [];
      if (headers.length > 0) {
        gsap.from(headers, {
          y: -20,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          clearProps: 'all',
          immediateRender: false
        });
      }

      // 4. Staggered List Items
      const listItems = containerRef.current?.querySelectorAll('li, .gsap-list-item') || [];
      if (listItems.length > 0) {
        gsap.from(listItems, {
          x: -15,
          opacity: 0,
          duration: 0.6,
          stagger: 0.05,
          ease: 'power2.out',
          clearProps: 'all',
          immediateRender: false
        });
      }
    }, containerRef.current);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, [containerRef, ...deps]);
};
