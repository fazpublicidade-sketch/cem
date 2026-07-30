import './style.css';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Initialize Lenis for smooth scrolling
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  direction: 'vertical',
  gestureDirection: 'vertical',
  smooth: true,
  mouseMultiplier: 1,
  smoothTouch: false,
  touchMultiplier: 2,
  infinite: false,
});

// Setup GSAP integration with Lenis
lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// GSAP Animations
window.addEventListener('DOMContentLoaded', () => {
  
  // Hero Animation
  const tl = gsap.timeline();
  
  tl.to('.hero-text-wrapper', {
    y: 0,
    opacity: 1,
    duration: 1.5,
    ease: 'power4.out',
    delay: 0.2
  });
  
  // Navbar blur effect on scroll
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (window.scrollY > 50) {
      nav.style.background = 'rgba(3, 3, 3, 0.8)';
      nav.style.backdropFilter = 'blur(20px)';
      nav.style.mixBlendMode = 'normal';
    } else {
      nav.style.background = 'linear-gradient(to bottom, rgba(3,3,3,0.9) 0%, rgba(3,3,3,0) 100%)';
      nav.style.backdropFilter = 'none';
      nav.style.mixBlendMode = 'difference';
    }
  });

  // Parallax for videos
  gsap.utils.toArray('.parallax-video video').forEach(video => {
    gsap.to(video, {
      yPercent: 20,
      ease: "none",
      scrollTrigger: {
        trigger: video.parentElement,
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });
  });

  // Fade up sections
  const sections = document.querySelectorAll('.section-title, .mod-card, .dif-card, .info-block');
  sections.forEach(sec => {
    gsap.fromTo(sec, 
      {
        y: 40,
        opacity: 0
      },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sec,
          start: 'top 85%',
        }
      }
    );
  });

  // Smooth anchor scrolling
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if(target) {
        lenis.scrollTo(target, { offset: -80 });
      }
    });
  });

  // Lazy load videos
  const lazyVideos = document.querySelectorAll('video.lazy-video');
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const video = entry.target;
          Array.from(video.children).forEach(videoSource => {
            if (typeof videoSource.tagName === "string" && videoSource.tagName === "SOURCE") {
              if (videoSource.dataset.src) {
                videoSource.src = videoSource.dataset.src;
                videoSource.removeAttribute('data-src');
              }
            }
          });
          video.load();
          video.play().catch(e => console.warn('Autoplay prevented:', e));
          observer.unobserve(video);
        }
      });
    }, { rootMargin: '0px 0px 500px 0px' });

    lazyVideos.forEach(video => {
      videoObserver.observe(video);
    });
  }

  // Modal Logic
  const modData = {
    musculacao: {
      title: 'Musculação',
      desc: 'Área completa com equipamentos Technogym de última geração. Perfeito para hipertrofia, força e condicionamento.',
      schedule: ['Seg a Sex: 05h às 22h', 'Sáb: 08h às 12h']
    },
    personal: {
      title: 'Personal Trainer',
      desc: 'Treinos exclusivos focados 100% no seu objetivo, com acompanhamento lado a lado dos nossos especialistas.',
      schedule: ['Horários flexíveis sob agendamento']
    },
    hyrox: {
      title: 'HYROX',
      desc: 'Treino de alta intensidade que combina corrida com exercícios funcionais. Supere todos os seus limites.',
      schedule: ['Seg e Qua: 07h, 19h', 'Sex: 07h']
    },
    running: {
      title: 'Mazzei Runners',
      desc: 'Assessoria de corrida para todos os níveis. Melhore seu pace, técnica e respiração correndo em grupo.',
      schedule: ['Ter e Qui: 06h', 'Sáb: 08h (Parque)']
    },
    pilates: {
      title: 'Pilates',
      desc: 'Fortalecimento do core, flexibilidade e postura através de movimentos precisos nos melhores aparelhos.',
      schedule: ['Seg a Qui: 08h e 18h', 'Sex: 08h']
    },
    jiujitsu: {
      title: 'Jiu-Jitsu',
      desc: 'Arte marcial imersiva para defesa pessoal, disciplina e condicionamento. Turmas separadas por nível.',
      schedule: ['Seg, Qua e Sex: 20h']
    },
    spinning: {
      title: 'Spinning',
      desc: 'Aulas de ciclismo indoor com música, jogo de luzes, muita energia e altíssimo gasto calórico.',
      schedule: ['Ter e Qui: 07h, 19h', 'Sáb: 09h']
    },
    massagem: {
      title: 'Massagem & Recovery',
      desc: 'Sessões de liberação miofascial e massagem desportiva para acelerar sua recuperação muscular no Recovery Center.',
      schedule: ['Agendamento prévio na recepção']
    }
  };

  const modal = document.getElementById('mod-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalSchedule = document.getElementById('modal-schedule');

  document.querySelectorAll('.mod-card').forEach(card => {
    card.addEventListener('click', () => {
      const mod = card.getAttribute('data-mod');
      const data = modData[mod];
      if (data && modal) {
        modalTitle.textContent = data.title;
        modalDesc.textContent = data.desc;
        modalSchedule.innerHTML = data.schedule.map(time => `<li><span><i class="ph ph-calendar-check" style="margin-right:8px; color:var(--accent);"></i> ${time}</span></li>`).join('');
        
        modal.classList.add('active');
        lenis.stop(); // prevent scrolling while modal is open
      }
    });
  });

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      lenis.start();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        lenis.start();
      }
    });
  }

});
