(() => {
  const header = document.getElementById("siteHeader");
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("mainNav");
  const navLinks = Array.from(document.querySelectorAll(".main-nav a[href^='#']"));

  // 1. Mobile Navigation Toggle
  function closeMenu() {
    if (!nav || !menuToggle) return;
    nav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("is-open")) return;
      if (!nav.contains(event.target) && !menuToggle.contains(event.target)) {
        closeMenu();
      }
    });
  }

  // 2. Sticky Header Scroll Shadow
  function syncHeaderScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", syncHeaderScroll, { passive: true });
  syncHeaderScroll();

  // 3. Active Section Highlight in Navigation
  const sections = navLinks
    .map((link) => {
      const id = link.getAttribute("href")?.slice(1);
      return id ? document.getElementById(id) : null;
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length > 0) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const activeHash = `#${entry.target.id}`;
          navLinks.forEach((link) => {
            link.classList.toggle("is-active", link.getAttribute("href") === activeHash);
          });
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((sec) => navObserver.observe(sec));
  }

  // 4. Stats Strip Count-Up Animation
  const statNumbers = Array.from(document.querySelectorAll(".stat-number[data-count]"));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function animateStat(el) {
    const target = Number(el.dataset.count || 0);
    const suffix = el.dataset.suffix || "";
    if (!target || prefersReducedMotion) {
      el.textContent = `${target.toLocaleString("en-US")}${suffix}`;
      return;
    }

    const duration = 1200;
    const start = performance.now();

    function tick(now) {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const current = Math.round(target * eased);
      el.textContent = `${current.toLocaleString("en-US")}${suffix}`;
      if (elapsed < 1) {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window && statNumbers.length > 0) {
    let counted = false;
    const statsObserver = new IntersectionObserver(
      (entries) => {
        if (counted) return;
        if (entries.some((entry) => entry.isIntersecting)) {
          counted = true;
          statNumbers.forEach(animateStat);
          statsObserver.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    statsObserver.observe(statNumbers[0]);
  }

  // 5. Interactive Product Category Filter
  const filterButtons = Array.from(document.querySelectorAll(".filter-btn[data-filter]"));
  const productCards = Array.from(document.querySelectorAll(".product-card[data-category]"));

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selected = btn.dataset.filter || "all";
      filterButtons.forEach((item) => item.classList.toggle("is-active", item === btn));

      productCards.forEach((card) => {
        const match = selected === "all" || card.dataset.category === selected;
        card.hidden = !match;
      });
    });
  });

  // 6. Product Quick-View Spec & Portfolio Lightbox Modal
  const modal = document.getElementById("detailModal");
  const modalDialog = document.getElementById("modalDialog");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalImage = document.getElementById("modalImage");
  const modalEyebrow = document.getElementById("modalEyebrow");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const modalSpecs = document.getElementById("modalSpecs");
  const modalLineCta = document.getElementById("modalLineCta");

  let lastTrigger = null;

  function openModal({ isLightbox, image, alt, eyebrow, title, desc, specs = [], ctaLabel }) {
    if (!modal || !modalDialog) return;
    lastTrigger = document.activeElement;

    modalDialog.classList.toggle("is-lightbox", Boolean(isLightbox));
    if (modalImage) {
      modalImage.src = image || "";
      modalImage.alt = alt || title || "";
    }
    if (modalEyebrow) modalEyebrow.textContent = eyebrow || "";
    if (modalTitle) modalTitle.textContent = title || "";
    if (modalDesc) modalDesc.textContent = desc || "";

    if (modalSpecs) {
      modalSpecs.innerHTML = "";
      if (specs.length > 0) {
        specs.forEach(([label, value]) => {
          const li = document.createElement("li");
          const strong = document.createElement("strong");
          strong.textContent = label;
          const span = document.createElement("span");
          span.textContent = value;
          li.append(strong, span);
          modalSpecs.appendChild(li);
        });
        modalSpecs.hidden = false;
      } else {
        modalSpecs.hidden = true;
      }
    }

    if (modalLineCta) {
      modalLineCta.textContent = ctaLabel || "สอบถามรุ่นนี้ทาง LINE (@437hyoco)";
    }

    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modalCloseBtn?.focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastTrigger && typeof lastTrigger.focus === "function") {
      lastTrigger.focus();
    }
  }

  // Bind Product Spec triggers
  productCards.forEach((card) => {
    const triggers = card.querySelectorAll("[data-open-spec]");
    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const rawSpecs = card.dataset.specs || "";
        const parsedSpecs = rawSpecs
          .split("|")
          .map((pair) => {
            const idx = pair.indexOf(":");
            return idx > -1 ? [pair.slice(0, idx).trim(), pair.slice(idx + 1).trim()] : null;
          })
          .filter(Boolean);

        openModal({
          isLightbox: false,
          image: card.dataset.image,
          alt: card.dataset.title,
          eyebrow: card.dataset.eyebrow,
          title: card.dataset.title,
          desc: card.dataset.desc,
          specs: parsedSpecs,
          ctaLabel: "สอบถามรายละเอียดรุ่นนี้ทาง LINE"
        });
      });
    });
  });

  // Bind Portfolio Lightbox triggers
  const portfolioCards = Array.from(document.querySelectorAll(".portfolio-card[data-lightbox-image]"));
  portfolioCards.forEach((card) => {
    function triggerLightbox() {
      openModal({
        isLightbox: true,
        image: card.dataset.lightboxImage,
        alt: card.dataset.lightboxTitle,
        eyebrow: card.dataset.lightboxEyebrow,
        title: card.dataset.lightboxTitle,
        desc: card.dataset.lightboxDesc,
        specs: [],
        ctaLabel: "สอบถามงานผลิตรูปแบบนี้ทาง LINE"
      });
    }

    card.addEventListener("click", triggerLightbox);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        triggerLightbox();
      }
    });
  });

  modalCloseBtn?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      closeMenu();
    }
  });
})();
