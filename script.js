gsap.registerPlugin(ScrollTrigger);

// Intro animation
gsap.from(".logo", { opacity: 0, y: -30, duration: 1.5, ease: "power2.out" });
gsap.from(".glow-line", { width: 0, duration: 1.5, delay: 0.5, ease: "power2.out" });
gsap.from(".tagline", { opacity: 0, y: 20, duration: 1.5, delay: 1 });

// Hero Scroll Animation
gsap.to(".hero h1", {
  scrollTrigger: {
    trigger: ".hero",
    start: "top center",
    scrub: 1,
  },
  y: -100,
  opacity: 0.5
});
gsap.to(".device", {
  scrollTrigger: {
    trigger: ".specs",
    start: "top bottom",
    scrub: 2,
  },
  scale: 0.8,
  y: -200,
  opacity: 0
});

// Specs Fade-In
gsap.utils.toArray(".spec").forEach((spec, i) => {
  gsap.from(spec, {
    scrollTrigger: {
      trigger: spec,
      start: "top 80%",
    },
    opacity: 0,
    y: 50,
    duration: 1,
    delay: i * 0.1
  });
});

// SSS Button Interaction
document.querySelector(".sss-btn").addEventListener("click", () => {
  gsap.to(".sss-content", {
    scale: 0.95,
    opacity: 0.8,
    duration: 0.4,
    yoyo: true,
    repeat: 1
  });
  alert("Entering SSS Secure Mode... 🔐");
});
