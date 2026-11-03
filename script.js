/*
 * Morrow Coffee — interaction and motion
 * All animation libraries are loaded locally before this file.
 */
(() => {
    "use strict";

    const doc = document;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopQuery = window.matchMedia("(min-width: 961px)");
    const header = doc.querySelector("[data-header]");
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const hasMotion = Boolean(gsap && ScrollTrigger);

    const headerHeight = () => (header ? header.getBoundingClientRect().height : 78);

    if (hasMotion) {
        gsap.registerPlugin(ScrollTrigger);
    }

    /* ---------------------------------------------------------
       Smooth scrolling
       --------------------------------------------------------- */

    let lenis = null;

    function initSmoothScroll() {
        if (!window.Lenis || reduceMotion.matches || lenis) {
            return;
        }

        lenis = new window.Lenis({
            duration: 1.05,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 0.9,
            touchMultiplier: 1.15,
        });

        if (hasMotion) {
            lenis.on("scroll", ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (time) => {
                lenis.raf(time);
                requestAnimationFrame(raf);
            };
            requestAnimationFrame(raf);
        }
    }

    function scrollToTopOf(target) {
        const top = target === doc.body || target.id === "top"
            ? 0
            : Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerHeight());

        if (lenis) {
            lenis.scrollTo(top, {
                duration: reduceMotion.matches ? 0.01 : 1.15,
                immediate: reduceMotion.matches,
            });
            return;
        }

        window.scrollTo({
            top,
            behavior: reduceMotion.matches ? "auto" : "smooth",
        });
    }

    /* ---------------------------------------------------------
       Header state + active section
       --------------------------------------------------------- */

    const navLinks = Array.from(doc.querySelectorAll("[data-nav-link]"));
    const navSections = navLinks
        .map((link) => ({
            link,
            section: doc.querySelector(link.getAttribute("href")),
        }))
        .filter((item) => item.section);

    let scrollTicking = false;

    function updateOnScroll() {
        if (header) {
            header.classList.toggle("is-scrolled", window.scrollY > 20);
        }

        const readingLine = headerHeight() + window.innerHeight * 0.34;
        let activeItem = null;

        navSections.forEach((item) => {
            const rect = item.section.getBoundingClientRect();
            if (rect.top <= readingLine && rect.bottom > readingLine) {
                activeItem = item;
            }
        });

        navLinks.forEach((link) => {
            const isActive = Boolean(activeItem && activeItem.link === link);
            link.classList.toggle("is-active", isActive);
            if (isActive) {
                link.setAttribute("aria-current", "location");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    function requestScrollUpdate() {
        if (scrollTicking) {
            return;
        }
        scrollTicking = true;
        requestAnimationFrame(() => {
            scrollTicking = false;
            updateOnScroll();
        });
    }

    window.addEventListener("scroll", requestScrollUpdate, { passive: true });

    /* ---------------------------------------------------------
       Portland open / closed status
       --------------------------------------------------------- */

    const openStatuses = Array.from(doc.querySelectorAll("[data-open-status]"));
    const openLabels = Array.from(doc.querySelectorAll("[data-open-label]"));
    const portlandClock = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    const week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hours = {
        Mon: [390, 1080],
        Tue: [390, 1080],
        Wed: [390, 1080],
        Thu: [390, 1080],
        Fri: [390, 1080],
        Sat: [450, 1020],
        Sun: [450, 1020],
    };

    function formatTime(minutes) {
        let hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const suffix = hour >= 12 ? "pm" : "am";
        hour = hour % 12 || 12;
        return minute === 0
            ? `${hour} ${suffix}`
            : `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
    }

    function updateOpenStatus() {
        if (!openStatuses.length || !openLabels.length) {
            return;
        }

        const parts = Object.fromEntries(
            portlandClock.formatToParts(new Date()).map((part) => [part.type, part.value])
        );
        const day = week.includes(parts.weekday) ? parts.weekday : "Mon";
        const dayIndex = week.indexOf(day);
        const now = (Number(parts.hour) % 24) * 60 + Number(parts.minute);
        const todayHours = hours[day] || hours.Mon;
        let label;

        if (now >= todayHours[0] && now < todayHours[1]) {
            openStatuses.forEach((status) => {
                status.classList.remove("is-closed");
                status.classList.add("is-open");
            });
            label = `Open until ${formatTime(todayHours[1])}`;
        } else {
            openStatuses.forEach((status) => {
                status.classList.remove("is-open");
                status.classList.add("is-closed");
            });

            if (now < todayHours[0]) {
                label = `Opens at ${formatTime(todayHours[0])}`;
            } else {
                const tomorrow = week[(dayIndex + 1) % 7];
                label = `Opens tomorrow at ${formatTime(hours[tomorrow][0])}`;
            }
        }

        openStatuses.forEach((status) => {
            status.title = `Portland local time · ${label}`;
        });
        openLabels.forEach((openLabel) => {
            openLabel.textContent = label;
        });
    }

    /* ---------------------------------------------------------
       Mobile navigation
       --------------------------------------------------------- */

    const navToggle = doc.querySelector("[data-nav-toggle]");
    const mobileNav = doc.querySelector("[data-mobile-nav]");
    const navClose = doc.querySelector("[data-nav-close]");
    const backgroundRegions = Array.from(
        doc.querySelectorAll("main, footer, .site-header, .skip-link")
    );
    let mobileNavOpen = false;
    let previousFocus = null;

    function setBackgroundInert(isInert) {
        backgroundRegions.forEach((region) => {
            if (isInert) {
                region.setAttribute("inert", "");
            } else {
                region.removeAttribute("inert");
            }
        });
    }

    function getMobileNavFocusables() {
        if (!mobileNav) {
            return [];
        }
        return Array.from(
            mobileNav.querySelectorAll(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter((element) => element.offsetParent !== null);
    }

    function openMobileNav() {
        if (!mobileNav || !navToggle || mobileNavOpen) {
            return;
        }

        mobileNavOpen = true;
        previousFocus = doc.activeElement === doc.body ? navToggle : doc.activeElement;
        mobileNav.classList.add("is-open");
        mobileNav.removeAttribute("inert");
        mobileNav.setAttribute("aria-hidden", "false");
        navToggle.setAttribute("aria-expanded", "true");
        doc.body.classList.add("nav-open");
        setBackgroundInert(true);

        if (lenis) {
            lenis.stop();
        }

        const focusNav = () => {
            const focusTarget = navClose || getMobileNavFocusables()[0];
            if (mobileNavOpen && focusTarget && !mobileNav.contains(doc.activeElement)) {
                mobileNav.scrollTop = 0;
                focusTarget.focus({ preventScroll: true });
            }
        };

        requestAnimationFrame(() => {
            requestAnimationFrame(focusNav);
        });
        window.setTimeout(focusNav, 80);
    }

    function closeMobileNav({ restoreFocus = true } = {}) {
        if (!mobileNav || !navToggle || !mobileNavOpen) {
            return;
        }

        mobileNavOpen = false;
        mobileNav.classList.remove("is-open");
        mobileNav.setAttribute("aria-hidden", "true");
        navToggle.setAttribute("aria-expanded", "false");
        doc.body.classList.remove("nav-open");
        setBackgroundInert(false);

        if (lenis) {
            lenis.start();
        }

        window.setTimeout(() => {
            if (!mobileNavOpen) {
                mobileNav.setAttribute("inert", "");
            }
        }, 600);

        if (restoreFocus) {
            const returnTarget = navToggle || previousFocus;
            if (returnTarget instanceof HTMLElement) {
                returnTarget.focus({ preventScroll: true });
            }
        }
    }

    if (navToggle && mobileNav) {
        mobileNav.setAttribute("inert", "");
        navToggle.addEventListener("click", openMobileNav);

        if (navClose) {
            navClose.addEventListener("click", () => closeMobileNav());
        }

        mobileNav.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeMobileNav();
                return;
            }

            if (event.key !== "Tab") {
                return;
            }

            const focusables = getMobileNavFocusables();
            if (!focusables.length) {
                return;
            }

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = doc.activeElement;

            if (event.shiftKey && (active === first || !mobileNav.contains(active))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (active === last || !mobileNav.contains(active))) {
                event.preventDefault();
                first.focus();
            }
        });

        desktopQuery.addEventListener("change", (event) => {
            if (event.matches && mobileNavOpen) {
                closeMobileNav({ restoreFocus: false });
            }
        });
    }

    /* ---------------------------------------------------------
       Same-page links
       --------------------------------------------------------- */

    let initialHashPending = Boolean(window.location.hash);
    let hashCorrectionFrame = 0;

    ["wheel", "touchstart", "pointerdown", "keydown"].forEach((type) => {
        window.addEventListener(type, () => {
            initialHashPending = false;
        }, { passive: true });
    });

    function alignToInitialHash() {
        if (!initialHashPending || !window.location.hash) {
            return;
        }

        const hash = window.location.hash;
        const target = hash === "#top"
            ? doc.body
            : doc.getElementById(decodeURIComponent(hash.slice(1)));

        if (!target) {
            return;
        }

        const top = target === doc.body
            ? 0
            : Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerHeight());

        if (lenis) {
            lenis.scrollTo(top, { immediate: true, force: true });
        } else {
            window.scrollTo(0, top);
        }

        updateOnScroll();
    }

    function queueHashAlignment() {
        window.cancelAnimationFrame(hashCorrectionFrame);
        hashCorrectionFrame = window.requestAnimationFrame(() => {
            hashCorrectionFrame = window.requestAnimationFrame(alignToInitialHash);
        });
    }

    doc.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.button !== 0) {
            return;
        }
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        const link = event.target.closest('a[href^="#"]');
        if (!link) {
            return;
        }

        const hash = link.getAttribute("href");
        if (!hash || hash === "#") {
            return;
        }

        const target = hash === "#top"
            ? doc.body
            : doc.getElementById(hash.slice(1));

        if (!target) {
            return;
        }

        event.preventDefault();
        initialHashPending = false;
        const cameFromMobileNav = Boolean(link.closest("[data-mobile-nav]"));

        if (mobileNavOpen) {
            closeMobileNav({ restoreFocus: false });
        }

        history.pushState(null, "", hash);

        const focusDestination = () => {
            if (!target.hasAttribute("tabindex")) {
                target.setAttribute("tabindex", "-1");
            }
            target.focus({ preventScroll: true });
        };

        requestAnimationFrame(() => {
            scrollToTopOf(target);
            window.setTimeout(focusDestination, cameFromMobileNav ? 80 : 0);
        });
    });

    window.addEventListener("popstate", () => {
        initialHashPending = false;
        if (!window.location.hash) {
            return;
        }
        const target = doc.getElementById(window.location.hash.slice(1));
        if (target) {
            scrollToTopOf(target);
        }
    });

    /* ---------------------------------------------------------
       Hero entrance and depth
       --------------------------------------------------------- */

    function setupHero() {
        if (!hasMotion) {
            return;
        }

        const mediaQuery = gsap.matchMedia();

        mediaQuery.add("(prefers-reduced-motion: no-preference)", () => {
            const card = doc.querySelector(".hero__card");
            const heroImage = doc.querySelector(".hero__media img");
            const stamp = doc.querySelector(".stamp--hero");

            if (!card) {
                return;
            }

            gsap.set(card, { rotate: -0.35 });

            const intro = gsap.timeline({
                defaults: { ease: "power3.out" },
                delay: 0.1,
            });

            intro
                .from(card, { autoAlpha: 0, y: 38, duration: 1.15 }, 0.15)
                .from(heroImage, {
                    scale: 1.11,
                    duration: 1.9,
                    ease: "power2.out",
                }, 0)
                .from(stamp, {
                    autoAlpha: 0,
                    scale: 0.86,
                    duration: 1.15,
                }, 0.5)
                .from(".hero__edition, .hero__capture", {
                    autoAlpha: 0,
                    y: 12,
                    duration: 0.85,
                    stagger: 0.08,
                }, 0.55)
                .from(".scroll-cue", {
                    autoAlpha: 0,
                    y: 8,
                    duration: 0.8,
                }, 0.85);
        });

        mediaQuery.add(
            "(min-width: 1280px) and (prefers-reduced-motion: no-preference)",
            () => {
                const media = doc.querySelector(".hero__media");
                if (!media) {
                    return;
                }

                gsap.set(media, { scale: 1.1, transformOrigin: "50% 50%" });
                gsap.to(media, {
                    yPercent: 4,
                    ease: "none",
                    scrollTrigger: {
                        trigger: ".hero",
                        start: "top top",
                        end: "bottom top",
                        scrub: true,
                        invalidateOnRefresh: true,
                    },
                });
            }
        );
    }

    /* ---------------------------------------------------------
       Generic content reveals
       --------------------------------------------------------- */

    function getElementRotation(element) {
        const transform = window.getComputedStyle(element).transform;
        if (!transform || transform === "none") {
            return 0;
        }

        try {
            const matrix = new DOMMatrixReadOnly(transform);
            return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
        } catch (error) {
            return 0;
        }
    }

    function setupReveals() {
        if (!hasMotion) {
            return;
        }

        const mediaQuery = gsap.matchMedia();

        mediaQuery.add("(prefers-reduced-motion: no-preference)", () => {
            const items = gsap.utils.toArray("[data-reveal]");

            items.forEach((element) => {
                const direction = element.getAttribute("data-reveal");
                const rotation = getElementRotation(element);
                const fromVars = {
                    autoAlpha: 0,
                    y: 0,
                    x: 0,
                    scale: 1,
                };

                if (direction === "left") {
                    fromVars.x = -28;
                } else if (direction === "scale") {
                    fromVars.y = 20;
                    fromVars.scale = 0.975;
                } else {
                    fromVars.y = 32;
                }

                if (rotation) {
                    fromVars.rotate = rotation;
                }

                gsap.set(element, fromVars);

                ScrollTrigger.create({
                    trigger: element,
                    start: "top 88%",
                    once: true,
                    onEnter: () => {
                        gsap.to(element, {
                            autoAlpha: 1,
                            x: 0,
                            y: 0,
                            scale: 1,
                            rotate: rotation,
                            duration: 1.05,
                            ease: "power3.out",
                            overwrite: "auto",
                        });
                    },
                });
            });
        });
    }

    function setupImageReveals() {
        if (!hasMotion) {
            return;
        }

        const mediaQuery = gsap.matchMedia();

        mediaQuery.add("(prefers-reduced-motion: no-preference)", () => {
            gsap.utils.toArray("[data-image-reveal]").forEach((frame) => {
                const image = frame.querySelector("img");
                gsap.set(frame, { clipPath: "inset(0 0 100% 0)" });

                if (image) {
                    gsap.set(image, { scale: 1.09 });
                }

                ScrollTrigger.create({
                    trigger: frame,
                    start: "top 86%",
                    once: true,
                    onEnter: () => {
                        const reveal = gsap.timeline({
                            defaults: { ease: "power3.inOut" },
                        });

                        reveal.to(frame, {
                            clipPath: "inset(0 0 0% 0)",
                            duration: 1.1,
                            clearProps: "clipPath",
                        }, 0);

                        if (image) {
                            reveal.to(image, {
                                scale: 1,
                                duration: 1.35,
                                ease: "power3.out",
                                clearProps: "transform",
                            }, 0.12);
                        }
                    },
                });
            });
        });
    }

    /* ---------------------------------------------------------
       The day — horizontal pinned timeline
       --------------------------------------------------------- */

    function setupDayTimeline() {
        if (!hasMotion) {
            return;
        }

        const day = doc.querySelector("[data-day]");
        if (!day) {
            return;
        }

        const mediaQuery = gsap.matchMedia();

        mediaQuery.add(
            "(min-width: 961px) and (prefers-reduced-motion: no-preference)",
            () => {
                const pin = day.querySelector(".day__pin");
                const viewport = day.querySelector(".day__viewport");
                const track = day.querySelector("[data-day-track]");
                const progressBar = day.querySelector("[data-day-progress]");
                const count = day.querySelector("[data-day-count]");
                const moments = Array.from(day.querySelectorAll(".moment"));

                if (!pin || !viewport || !track || !progressBar || !count) {
                    return;
                }

                day.classList.add("is-horizontal");

                const progressSetter = gsap.quickSetter(progressBar, "scaleX");
                const totalMoments = moments.length;

                const getDistance = () =>
                    Math.max(1, track.scrollWidth - viewport.clientWidth);

                const updateProgress = (progress) => {
                    const current = Math.min(
                        totalMoments,
                        Math.max(1, Math.ceil(progress * totalMoments - 0.001))
                    );

                    progressSetter(progress);
                    count.textContent = `${String(current).padStart(2, "0")} / ${String(totalMoments).padStart(2, "0")}`;
                };

                const horizontalTween = gsap.to(track, {
                    x: () => -getDistance(),
                    ease: "none",
                    scrollTrigger: {
                        trigger: day,
                        start: () => `top top+=${headerHeight()}`,
                        end: () => `+=${getDistance()}`,
                        pin,
                        pinSpacing: true,
                        anticipatePin: 1,
                        scrub: 0.8,
                        invalidateOnRefresh: true,
                        onUpdate: (self) => updateProgress(self.progress),
                    },
                });

                updateProgress(0);

                return () => {
                    horizontalTween.kill();
                    day.classList.remove("is-horizontal");
                    progressBar.style.transform = "";
                    count.textContent = `01 / ${String(totalMoments).padStart(2, "0")}`;
                };
            }
        );
    }

    /* ---------------------------------------------------------
       Roast curve
       --------------------------------------------------------- */

    function setupRoastCurve() {
        if (!hasMotion) {
            return;
        }

        const graph = doc.querySelector(".roast__graph");
        const line = doc.querySelector(".roast-curve__line");
        const fill = doc.querySelector(".roast-curve__fill");
        const marker = doc.querySelector(".roast-curve__marker");
        const dot = doc.querySelector(".roast-curve__dot");

        if (!graph || !line) {
            return;
        }

        const mediaQuery = gsap.matchMedia();

        mediaQuery.add("(prefers-reduced-motion: no-preference)", () => {
            const length = line.getTotalLength();

            gsap.set(line, {
                strokeDasharray: length,
                strokeDashoffset: length,
            });
            if (fill) {
                gsap.set(fill, { opacity: 0 });
            }
            if (marker) {
                gsap.set(marker, { opacity: 0 });
            }
            if (dot) {
                gsap.set(dot, {
                    scale: 0,
                    autoAlpha: 0,
                    transformOrigin: "50% 50%",
                });
            }

            const curve = gsap.timeline({
                scrollTrigger: {
                    trigger: graph,
                    start: "top 84%",
                    once: true,
                },
            });

            curve.to(line, {
                strokeDashoffset: 0,
                duration: 1.7,
                ease: "power2.inOut",
            }, 0);

            if (fill) {
                curve.to(fill, { opacity: 1, duration: 0.9 }, 0.45);
            }
            if (marker) {
                curve.to(marker, { opacity: 1, duration: 0.7 }, 1.15);
            }
            if (dot) {
                curve.to(dot, {
                    scale: 1,
                    autoAlpha: 1,
                    duration: 0.5,
                    ease: "back.out(2)",
                }, 1.45);
            }

            return () => {
                gsap.set([line, fill, marker, dot].filter(Boolean), {
                    clearProps: "all",
                });
            };
        });
    }

    /* ---------------------------------------------------------
       Start
       --------------------------------------------------------- */

    function refreshMeasurements() {
        if (hasMotion) {
            ScrollTrigger.refresh();
        }

        // A direct #hash link is scrolled by the browser before pinned
        // sections add their spacing. Re-resolve the target once the final
        // layout exists, unless the visitor has already started scrolling.
        if (initialHashPending) {
            queueHashAlignment();
        }
    }

    function init() {
        initSmoothScroll();
        updateOpenStatus();
        updateOnScroll();

        setupHero();
        setupReveals();
        setupImageReveals();
        setupDayTimeline();
        setupRoastCurve();

        window.setInterval(updateOpenStatus, 60 * 1000);
        doc.addEventListener("visibilitychange", () => {
            if (!doc.hidden) {
                updateOpenStatus();
            }
        });

        window.addEventListener("load", refreshMeasurements, { once: true });

        if (doc.fonts && doc.fonts.ready) {
            doc.fonts.ready.then(refreshMeasurements);
        }
    }

    if (doc.readyState === "loading") {
        doc.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
