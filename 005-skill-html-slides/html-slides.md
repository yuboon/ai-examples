# 生成HTML演示稿

根据用户需求生成一份**视觉精美、动画丰富**的HTML演示稿，追求苹果发布会级别的视觉品质。

## 主题与需求
{{cursor}}

---

## 核心设计原则

### 视觉层次
1. **第一眼惊艳**：标题页要有冲击力
2. **信息清晰**：每页一个核心信息
3. **呼吸感**：大量留白，避免拥挤
4. **一致性**：统一的配色、字体、间距

### 动画哲学
1. **有意义**：动画服务于内容，不是为了炫技
2. **流畅自然**：使用 cubic-bezier 缓动函数
3. **层次分明**：元素按顺序入场，不是同时出现
4. **性能优先**：优先使用 transform 和 opacity

---

## 必须实现的动画效果

### 1. 页面切换动画（必须）
```css
/* 页面入场 - 多层叠加效果 */
.slide {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
    filter: blur(10px);
    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide.active {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
}
.slide.exit {
    opacity: 0;
    transform: translateY(-30px) scale(1.02);
    filter: blur(5px);
}
```

### 2. 元素入场动画（必须）
每个页面内的元素需要**依次入场**，而不是同时出现：

```css
/* 基础入场动画 */
@keyframes fadeSlideUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 延迟入场 */
.slide.active .animate-item:nth-child(1) { animation: fadeSlideUp 0.6s 0.1s both; }
.slide.active .animate-item:nth-child(2) { animation: fadeSlideUp 0.6s 0.2s both; }
.slide.active .animate-item:nth-child(3) { animation: fadeSlideUp 0.6s 0.3s both; }
.slide.active .animate-item:nth-child(4) { animation: fadeSlideUp 0.6s 0.4s both; }

/* 标题特殊动画 */
@keyframes titleReveal {
    from {
        opacity: 0;
        transform: translateY(50px);
        filter: blur(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
    }
}
.slide.active .title-animate {
    animation: titleReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

### 3. 背景动态效果（必须）
```css
/* 光晕呼吸动画 */
@keyframes glowPulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.1); }
}
.glow-orb {
    animation: glowPulse 8s ease-in-out infinite;
}

/* 网格流动效果 */
@keyframes gridMove {
    0% { transform: translateY(0); }
    100% { transform: translateY(60px); }
}
.grid-bg {
    animation: gridMove 20s linear infinite;
}

/* 渐变流动 */
@keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}
.gradient-bg {
    background: linear-gradient(-45deg, #0a0a0f, #1a1a2e, #0f0f1a, #1e1e3f);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
}
```

### 4. 卡片交互动画（必须）
```css
/* 卡片悬停效果 */
.glass-card {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.glass-card:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow:
        0 20px 40px rgba(0,0,0,0.4),
        0 0 60px rgba(99,102,241,0.15);
    border-color: rgba(99,102,241,0.4);
}

/* 卡片内图标动画 */
.glass-card:hover .card-icon {
    transform: scale(1.1) rotate(5deg);
}
```

### 5. 标题页特效（必须）
```css
/* 主标题渐变动画 */
@keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
}
.main-title {
    background: linear-gradient(
        90deg,
        #fff 0%,
        #a5b4fc 25%,
        #fff 50%,
        #c4b5fd 75%,
        #fff 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 4s linear infinite;
}

/* 图标浮动 */
@keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    25% { transform: translateY(-15px) rotate(3deg); }
    75% { transform: translateY(-8px) rotate(-3deg); }
}
.hero-icon {
    animation: float 6s ease-in-out infinite;
}

/* 装饰粒子 */
@keyframes particle {
    0% { transform: translateY(0) rotate(0deg); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
}
```

### 6. 代码块效果
```css
/* 代码块打字机效果 */
@keyframes typewriter {
    from { width: 0; }
    to { width: 100%; }
}

/* 代码高亮闪烁 */
@keyframes highlight {
    0%, 100% { background: transparent; }
    50% { background: rgba(99,102,241,0.2); }
}

/* 行号淡入 */
.code-block .line {
    opacity: 0;
    animation: fadeIn 0.3s forwards;
}
```

### 7. 进度条动画
```css
.progress-bar {
    background: linear-gradient(90deg, #6366f1, #a855f7, #ec4899);
    background-size: 200% 100%;
    animation: progressGlow 2s linear infinite;
}
@keyframes progressGlow {
    0% { background-position: 100% 0; }
    100% { background-position: -100% 0; }
}
```

---

## 完整CSS模板

```css
:root {
    --bg-primary: #07070a;
    --bg-secondary: #0d0d14;
    --accent: #6366f1;
    --accent-secondary: #a855f7;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --border: rgba(255,255,255,0.06);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    overflow: hidden;
}

/* 动态渐变背景 */
.bg-animated {
    position: fixed;
    inset: 0;
    background: linear-gradient(-45deg, #07070a, #0d0d14, #0a0a12, #12121f);
    background-size: 400% 400%;
    animation: gradientShift 20s ease infinite;
    z-index: -3;
}

/* 网格背景 */
.grid-overlay {
    position: fixed;
    inset: 0;
    background-image:
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 80px 80px;
    z-index: -2;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
}

/* 光晕装饰 */
.glow-orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(100px);
    pointer-events: none;
    z-index: -1;
}
.glow-orb-1 {
    width: 800px; height: 800px;
    background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%);
    top: -300px; right: -300px;
    animation: glowPulse 10s ease-in-out infinite;
}
.glow-orb-2 {
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 60%);
    bottom: -200px; left: -200px;
    animation: glowPulse 12s ease-in-out infinite 2s;
}

/* 玻璃卡片 */
.glass-card {
    background: rgba(255,255,255,0.02);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 24px;
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    overflow: hidden;
}
.glass-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
    opacity: 0;
    transition: opacity 0.3s;
}
.glass-card:hover {
    transform: translateY(-10px);
    border-color: rgba(99,102,241,0.3);
    box-shadow:
        0 25px 50px rgba(0,0,0,0.5),
        0 0 80px rgba(99,102,241,0.2),
        inset 0 1px 0 rgba(255,255,255,0.1);
}
.glass-card:hover::before {
    opacity: 1;
}

/* 渐变文字 */
.gradient-text {
    background: linear-gradient(135deg, #fff 0%, #a5b4fc 50%, #c4b5fd 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

/* 代码块 */
.code-block {
    background: linear-gradient(135deg, #0d0d14 0%, #0a0a10 100%);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 16px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.875rem;
    line-height: 1.8;
    position: relative;
}
.code-block::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 40px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    border-radius: 16px 16px 0 0;
}

/* 动画关键帧 */
@keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

@keyframes glowPulse {
    0%, 100% { opacity: 0.4; transform: scale(1) translateZ(0); }
    50% { opacity: 0.7; transform: scale(1.1) translateZ(0); }
}

@keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
}

@keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(5deg); }
}
```

---

## 标题页完整模板

```html
<div class="slide active items-center justify-center text-center">
    <!-- 背景 -->
    <div class="bg-animated"></div>
    <div class="grid-overlay"></div>
    <div class="glow-orb glow-orb-1"></div>
    <div class="glow-orb glow-orb-2"></div>

    <!-- 内容 -->
    <div class="relative z-10">
        <!-- 图标 -->
        <div class="hero-icon text-9xl mb-10">🚀</div>

        <!-- 主标题 -->
        <h1 class="main-title text-8xl font-bold mb-6">
            演示标题
        </h1>

        <!-- 副标题 -->
        <p class="text-2xl text-slate-400 mb-8 animate-item" style="animation-delay: 0.3s">
            副标题描述
        </p>

        <!-- 标签 -->
        <div class="flex justify-center gap-3 animate-item" style="animation-delay: 0.5s">
            <span class="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-400">
                演讲者
            </span>
            <span class="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-400">
                日期
            </span>
        </div>
    </div>
</div>

<style>
.main-title {
    background: linear-gradient(90deg, #fff, #a5b4fc, #fff, #c4b5fd, #fff);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 4s linear infinite, fadeSlideUp 1s both;
}
.hero-icon {
    animation: float 6s ease-in-out infinite, fadeSlideUp 0.8s both;
}
.animate-item {
    animation: fadeSlideUp 0.8s both;
}
</style>
```

---

## 内容页完整模板

```html
<div class="slide">
    <!-- 背景（每个页面都需要） -->
    <div class="bg-animated"></div>
    <div class="grid-overlay"></div>
    <div class="glow-orb glow-orb-1"></div>
    <div class="glow-orb glow-orb-2"></div>

    <!-- 内容 -->
    <div class="relative z-10 min-h-screen flex flex-col justify-center px-20">
        <!-- 标题 -->
        <h2 class="title-animate text-6xl font-bold mb-12 gradient-text">
            页面标题
        </h2>

        <!-- 内容区域 -->
        <div class="grid grid-cols-2 gap-8">
            <div class="animate-item glass-card p-10">
                <h3 class="text-2xl font-semibold mb-4">卡片标题</h3>
                <p class="text-slate-400 text-lg leading-relaxed">
                    卡片内容描述...
                </p>
            </div>
            <div class="animate-item glass-card p-10" style="animation-delay: 0.15s">
                <h3 class="text-2xl font-semibold mb-4">卡片标题</h3>
                <p class="text-slate-400 text-lg leading-relaxed">
                    卡片内容描述...
                </p>
            </div>
        </div>
    </div>
</div>

<style>
.slide.active .title-animate {
    animation: fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.slide.active .animate-item:nth-child(1) { animation: fadeSlideUp 0.6s 0.2s both; }
.slide.active .animate-item:nth-child(2) { animation: fadeSlideUp 0.6s 0.35s both; }
.slide.active .animate-item:nth-child(3) { animation: fadeSlideUp 0.6s 0.5s both; }
.slide.active .animate-item:nth-child(4) { animation: fadeSlideUp 0.6s 0.65s both; }
</style>
```

---

## JavaScript 控制

```javascript
const slides = document.querySelectorAll('.slide');
const totalSlides = slides.length;
let currentSlide = 0;

function goToSlide(index) {
    if (index < 0 || index >= totalSlides) return;

    // 退出动画
    slides[currentSlide].classList.remove('active');
    slides[currentSlide].classList.add('exit');

    setTimeout(() => {
        slides[currentSlide].classList.remove('exit');
        currentSlide = index;
        slides[currentSlide].classList.add('active');
        updateProgress();
    }, 300);
}

function updateProgress() {
    const progress = ((currentSlide + 1) / totalSlides) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('pageNum').textContent = currentSlide + 1;
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowRight':
        case ' ':
        case 'Enter':
            e.preventDefault();
            goToSlide(currentSlide + 1);
            break;
        case 'ArrowLeft':
            e.preventDefault();
            goToSlide(currentSlide - 1);
            break;
        case 'Home':
            e.preventDefault();
            goToSlide(0);
            break;
        case 'End':
            e.preventDefault();
            goToSlide(totalSlides - 1);
            break;
    }
});

// 触摸支持
let touchStartX = 0;
document.addEventListener('touchstart', e => touchStartX = e.touches[0].clientX);
document.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
        goToSlide(currentSlide + (diff > 0 ? 1 : -1));
    }
});

// 初始化
document.getElementById('totalPages').textContent = totalSlides;
updateProgress();
```

---

## 质量检查清单

- [ ] 页面切换有模糊 + 位移 + 缩放组合动画
- [ ] 元素依次入场，不是同时出现
- [ ] 背景有动态渐变或光晕呼吸效果
- [ ] 卡片悬停有上浮 + 发光效果
- [ ] 标题使用渐变色 + 闪烁动画
- [ ] 进度条有流光效果
- [ ] 代码块有语法高亮
- [ ] 整体配色克制高级，不超过3种主色

---

## 输出要求

1. **先列出页面规划**
2. **输出完整HTML代码**（单文件，可直接运行）
3. **确保所有动画效果都已实现**
