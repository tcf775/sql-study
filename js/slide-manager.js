export class SlideManager {
    constructor() {
        this.slides = new Map();
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.elements = {
            slideModal: document.getElementById('slide-modal'),
            slideTitle: document.getElementById('slide-title'),
            slideIframe: document.getElementById('slide-iframe'),
            closeSlide: document.getElementById('close-slide'),
            continueGame: document.getElementById('continue-game')
        };
    }

    bindEvents() {
        this.elements.closeSlide.addEventListener('click', () => this.hideSlide());
        this.elements.continueGame.addEventListener('click', () => this.hideSlide());
        
        // モーダル外クリックで閉じる
        this.elements.slideModal.addEventListener('click', (e) => {
            if (e.target === this.elements.slideModal) {
                this.hideSlide();
            }
        });
        
        // ESCキーで閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.elements.slideModal.classList.contains('hidden')) {
                this.hideSlide();
            }
        });
    }

    // スライド情報を登録
    registerSlide(id, title, htmlPath) {
        this.slides.set(id, { title, htmlPath });
    }

    // スライドを表示
    showSlide(slideId) {
        const slide = this.slides.get(slideId);
        if (!slide) {
            console.error(`スライドが見つかりません: ${slideId}`);
            // スライドが見つからない場合は簡単なメッセージを表示
            this.elements.slideTitle.textContent = '解説スライド';
            this.elements.slideIframe.srcdoc = `
                <div style="padding: 2rem; text-align: center; font-family: Arial, sans-serif;">
                    <h2>解説スライド準備中</h2>
                    <p>このチャレンジの解説スライドは現在準備中です。</p>
                    <p>基本的なSQLの書き方を参考に問題に取り組んでみてください。</p>
                </div>
            `;
        } else {
            this.elements.slideTitle.textContent = slide.title;
            this.elements.slideIframe.src = slide.htmlPath;
        }
        
        this.elements.slideModal.classList.remove('hidden');
    }

    // スライドを非表示
    hideSlide() {
        this.elements.slideModal.classList.add('hidden');
        this.elements.slideIframe.src = '';
        this.elements.slideIframe.srcdoc = '';
    }

    // 初期スライドデータを登録
    loadSlides() {
        // 例：基本的なSQLスライド
        this.registerSlide('sql-basics', 'SQL基礎', 'slides/sql-basics.html');
        this.registerSlide('select-intro', 'SELECT文入門', 'slides/select-intro.html');
        this.registerSlide('join-basics', 'JOIN基礎', 'slides/join-basics.html');
        this.registerSlide('aggregate-functions', '集約関数', 'slides/aggregate-functions.html');
    }
}