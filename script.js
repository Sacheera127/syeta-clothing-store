document.addEventListener('DOMContentLoaded', () => {
    /* ==========================================================================
       1. Core Data & State
       ========================================================================== */
    const productImages = [
        "1.png", "2.png", "3.png", "4.png",
        "Blouse1.JPEG.jpg", "Blouse2.JPEG.jpg",
        "Item10.JPEG.jpg", "Item11.JPEG.jpg", "Item12.JPEG.jpg", "Item13.JPEG.jpg",
        "Item14.jpg", "Item15.jpg", "Item16.JPEG.jpg", "Item17.heic", 
        "Item18.JPG", "Item19.JPG", "Item20.JPEG.jpg", "Item21.JPG", 
        "Item22.JPEG.jpg", "Item23.JPEG.jpg", "Item24.JPEG.jpg", "Item25.JPEG.jpg",
        "Item3.JPEG.jpg", "Item4.JPEG.jpg", "Item5.JPEG.jpg", "Item6.JPEG.jpg", 
        "Item7.JPG", "Item8.JPEG.jpg", "Item9.jpg",
        "Syeta 1.JPEG.jpg", "Syeta 2.jpg", "Untitled design.png"
    ];

    const categories = ['new', 'casual', 'work', 'party', 'dresses', 'tops', 'bottoms'];
    const sizes = ['S', 'M', 'L', 'XL'];

    let adminData = JSON.parse(localStorage.getItem('syeta_admin_data')) || {
        edited: {}, 
        added: []
    };

    function formatProductName(filename) {
        let name = filename.split('.')[0].replace(/([A-Z])/g, ' $1').trim();
        name = name.replace(/[0-9]/g, ' $&');
        return "Syeta " + name;
    }

    let products = productImages.map((img, index) => {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const price = Math.floor(Math.random() * ((9000 - 4500) / 100 + 1)) * 100 + 4500;
        
        const productId = `prod_${index + 1}`;
        const editedProduct = adminData.edited[productId] || {};
        
        return {
            id: productId,
            name: editedProduct.name || formatProductName(img),
            price: price,
            category: category,
            image: `Images/${img}`,
            gallery: editedProduct.gallery || [`Images/${img}`],
            sizeChart: editedProduct.sizeChart || null,
            sizes: editedProduct.sizes || [...sizes],
            inStock: editedProduct.hasOwnProperty('inStock') ? editedProduct.inStock : true
        };
    });

    if (adminData.added && adminData.added.length > 0) {
        const addedProds = adminData.added.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.category,
            image: p.gallery && p.gallery.length > 0 ? p.gallery[0] : p.image,
            gallery: p.gallery || (p.image ? [p.image] : []),
            sizeChart: p.sizeChart || null,
            sizes: [...sizes],
            inStock: p.hasOwnProperty('inStock') ? p.inStock : true
        }));
        products = [...products, ...addedProds];
    }

    function formatCurrency(amount) {
        return `LKR ${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }

    /* ==========================================================================
       2. DOM Elements & UI State
       ========================================================================== */
    const productGrid = document.getElementById('productGrid');
    const productCount = document.getElementById('productCount');
    const header = document.getElementById('header');
    
    // Filters
    const categoryRadios = document.querySelectorAll('input[name="category"]');
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    const applyPriceFilterBtn = document.getElementById('applyPriceFilter');
    const sortSelect = document.getElementById('sortSelect');
    
    // Toggles
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    // Navigation
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const mainNav = document.getElementById('mainNav');
    const overlay = document.getElementById('overlay');
    
    // Cart
    const cartIcon = document.getElementById('cartIcon');
    const cartSidebar = document.getElementById('cartSidebar');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartBadge = document.getElementById('cartBadge');
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalPrice = document.getElementById('cartTotalPrice');
    
    // Modal
    const productModal = document.getElementById('productModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalImg = document.getElementById('modalImg');
    const modalTitle = document.getElementById('modalTitle');
    const modalPrice = document.getElementById('modalPrice');
    const modalSku = document.getElementById('modalSku');
    const modalQty = document.getElementById('modalQty');
    const modalQtyMinus = document.querySelector('.qty-btn.minus');
    const modalQtyPlus = document.querySelector('.qty-btn.plus');
    const modalAddToCartBtn = document.getElementById('addToCartBtn');
    const addToWishlistBtn = document.getElementById('addToWishlistBtn');
    
    // Toast
    const toast = document.getElementById('toast');

    let currentFilters = {
        category: new URLSearchParams(window.location.search).get('category') || 'all',
        minPrice: 0,
        maxPrice: Number.MAX_SAFE_INTEGER,
        search: ''
    };
    
    let currentSort = 'newest';
    let cart = JSON.parse(localStorage.getItem('syeta_cart')) || [];
    let wishlist = JSON.parse(localStorage.getItem('syeta_wishlist')) || [];
    let currentModalProduct = null;
    let selectedSize = 'M';

    /* ==========================================================================
       3. Initialization & Main Logic
       ========================================================================== */
    function init() {
        applyFiltersAndSort();
        updateCartCount();
        renderCart();
        updateWishlistCount();
        renderWishlist();
        setupEventListeners();
    }

    function applyFiltersAndSort() {
        if (!productGrid) return;
        
        let filtered = products.filter(p => {
            const catMatch = currentFilters.category === 'all' || p.category === currentFilters.category;
            const priceMatch = p.price >= currentFilters.minPrice && p.price <= currentFilters.maxPrice;
            const searchMatch = !currentFilters.search || p.name.toLowerCase().includes(currentFilters.search);
            return catMatch && priceMatch && searchMatch;
        });

        if (currentSort === 'price-low') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (currentSort === 'price-high') {
            filtered.sort((a, b) => b.price - a.price);
        }

        renderProducts(filtered);
    }

    function renderProducts(productsToRender) {
        if (!productGrid) return;
        productGrid.innerHTML = '';
        
        if (productsToRender.length === 0) {
            productGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px 0; color: #888;">No products found matching your criteria.</div>';
            if (productCount) productCount.textContent = 'Showing 0 products';
            return;
        }

        productsToRender.forEach(product => {
            const productHtml = `
                <div class="product-card">
                    <div class="product-image-container" onclick="openModal('${product.id}')">
                        <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='pictures/Carousel_Placeholder.png'">
                        <div class="product-badges">
                            ${product.inStock ? '' : '<span class="badge sale">Out of stock</span>'}
                            ${product.category === 'new' ? '<span class="badge">New</span>' : ''}
                        </div>
                        <div class="product-actions" onclick="event.stopPropagation()">
                            <button class="action-btn" onclick="openModal('${product.id}')">Quick View</button>
                        </div>
                    </div>
                    <div class="product-info">
                        <div class="product-category">${product.category}</div>
                        <h3 class="product-title" onclick="openModal('${product.id}')">${product.name}</h3>
                        <div class="product-price">${formatCurrency(product.price)}</div>
                        <div class="product-sizes">
                            ${product.sizes.map(size => `<span class="size-pill">${size}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
            productGrid.innerHTML += productHtml;
        });

        if (productCount) productCount.textContent = `Showing ${productsToRender.length} products`;
    }

    window.openModal = function(id) {
        const product = products.find(p => p.id === id);
        if (!product || !productModal) return;
        currentModalProduct = product;
        
        // Gallery
        const modalImgContainer = document.querySelector('.modal-image');
        if (modalImgContainer) {
            if (product.gallery && product.gallery.length > 1) {
                let dotsHTML = `<div style="text-align:center; margin-top:10px;">${product.gallery.map((_, i) => `<span style="display:inline-block; width:8px; height:8px; background:${i===0?'#333':'#ccc'}; border-radius:50%; margin:0 4px;"></span>`).join('')}</div>`;
                const galleryInner = product.gallery.map(img => `<img src="${img}" style="max-height: 500px; object-fit: contain; flex: 0 0 100%; scroll-snap-align: start;">`).join('');
                
                modalImgContainer.innerHTML = `
                    <div style="display:flex; flex-direction:column; width:100%;">
                        <div style="display:flex; overflow-x:auto; scroll-snap-type: x mandatory; width:100%; scrollbar-width: none;" onscroll="
                            let idx = Math.round(this.scrollLeft / this.clientWidth);
                            let dots = this.nextElementSibling.children;
                            for(let i=0; i<dots.length; i++) {
                               if(dots[i].tagName === 'SPAN') dots[i].style.background = (i===idx)?'#333':'#ccc';
                            }
                        ">
                            ${galleryInner}
                        </div>
                        ${dotsHTML}
                        <div style="text-align:center; font-size:0.75rem; color:#888; margin-top:5px;">Swipe to view more</div>
                    </div>
                    <style>.modal-image div::-webkit-scrollbar { display: none; }</style>
                `;
            } else {
                modalImgContainer.innerHTML = `<img id="modalImg" src="${product.image}" alt="Product Image" style="max-height: 500px; object-fit: contain; width:100%;">`;
            }
        }

        if (modalTitle) modalTitle.textContent = product.name;
        if (modalPrice) modalPrice.textContent = formatCurrency(product.price);
        if (modalSku) modalSku.textContent = `SYE-${product.id.split('_')[1].padStart(3, '0')}`;
        if (modalQty) modalQty.value = 1;
        
        const badgeContainer = document.querySelector('.modal-badges');
        if (badgeContainer) {
            badgeContainer.innerHTML = product.inStock ? '<span class="in-stock-badge" style="background:var(--badge-bg)">In stock</span>' : '<span class="in-stock-badge" style="background:#d62828">Out of stock</span>';
        }
        
        const sizeOptionsContainer = document.querySelector('.size-options');
        if (sizeOptionsContainer) {
            const allSizes = ['S', 'M', 'L', 'XL'];
            sizeOptionsContainer.innerHTML = allSizes.map(s => {
                const isAvailable = product.sizes.includes(s);
                return `<button class="size-btn" ${!isAvailable ? 'disabled' : ''}>${s}</button>`;
            }).join('');
            
            const newSizeBtns = document.querySelectorAll('.product-modal .size-btn:not([disabled])');
            if (newSizeBtns.length > 0) {
                newSizeBtns[0].classList.add('active');
                selectedSize = newSizeBtns[0].textContent;
            } else {
                selectedSize = null;
            }
            
            newSizeBtns.forEach((btn) => {
                btn.addEventListener('click', () => {
                    newSizeBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedSize = btn.textContent;
                    if(modalAddToCartBtn) {
                        modalAddToCartBtn.disabled = false;
                        modalAddToCartBtn.style.opacity = '1';
                        modalAddToCartBtn.textContent = 'Add to Bag';
                    }
                });
            });
            
            if (modalAddToCartBtn) {
                if (newSizeBtns.length === 0 || !product.inStock) {
                    modalAddToCartBtn.disabled = true;
                    modalAddToCartBtn.style.opacity = '0.5';
                    modalAddToCartBtn.textContent = 'Currently Unavailable';
                } else {
                    modalAddToCartBtn.disabled = false;
                    modalAddToCartBtn.style.opacity = '1';
                    modalAddToCartBtn.textContent = 'Add to Bag';
                }
            }
        }
        
        const chartContainer = document.getElementById('modalSizeChartContainer');
        if (chartContainer) {
            if (product.sizeChart) {
                chartContainer.innerHTML = `<h4 style="font-size:0.9rem; text-transform:uppercase; margin-bottom:10px;">Size Chart</h4>
                                           <img src="${product.sizeChart}" style="max-width:100%; border:1px solid #eee; border-radius:4px;">`;
            } else {
                chartContainer.innerHTML = '';
            }
        }

        productModal.classList.add('open');
    }

    function setupEventListeners() {
        // Carousel Logic
        const track = document.getElementById('carouselTrack');
        const slides = Array.from(document.querySelectorAll('.carousel-slide'));
        const nextBtn = document.getElementById('carouselNext');
        const prevBtn = document.getElementById('carouselPrev');
        const indicators = Array.from(document.querySelectorAll('.carousel-indicator'));
        
        if (track && slides.length > 0) {
            let currentSlide = 0;
            
            function updateCarousel() {
                track.style.transform = `translateX(-${currentSlide * 100}%)`;
                indicators.forEach(ind => ind.classList.remove('active'));
                if(indicators[currentSlide]) indicators[currentSlide].classList.add('active');
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    currentSlide = (currentSlide + 1) % slides.length;
                    updateCarousel();
                });
            }
            
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
                    updateCarousel();
                });
            }
            
            indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', () => {
                    currentSlide = index;
                    updateCarousel();
                });
            });
            
            setInterval(() => {
                if(nextBtn) nextBtn.click();
            }, 5000);
        }

        window.addEventListener('scroll', () => {
            if (header) {
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            }
        });

        const navCategories = document.querySelectorAll('.nav-category');
        if (navCategories) {
            navCategories.forEach(link => {
                link.addEventListener('click', (e) => {
                    const filter = link.getAttribute('data-filter');
                    if (!productGrid) {
                        window.location.href = 'index.html?category=' + filter;
                        return;
                    }
                    e.preventDefault();
                    navCategories.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    currentFilters.category = filter;
                    const radio = document.querySelector(`input[name="category"][value="${currentFilters.category}"]`);
                    if(radio) radio.checked = true;
                    applyFiltersAndSort();
                });
            });
        }

        const filterHeaders = document.querySelectorAll('.filter-header');
        if (filterHeaders) {
            filterHeaders.forEach(headerElem => {
                headerElem.addEventListener('click', () => {
                    headerElem.parentElement.classList.toggle('closed');
                });
            });
        }

        const searchIconBtn = document.getElementById('searchIconBtn');
        const searchBox = document.getElementById('searchBox');
        const searchInput = document.getElementById('searchInput');
        const searchCloseBtn = document.getElementById('searchCloseBtn');

        if (searchIconBtn && searchBox && searchInput) {
            searchIconBtn.addEventListener('click', (e) => {
                e.preventDefault();
                searchBox.classList.toggle('open');
                if (searchBox.classList.contains('open')) searchInput.focus();
            });
            
            if (searchCloseBtn) {
                searchCloseBtn.addEventListener('click', () => {
                    searchBox.classList.remove('open');
                    searchInput.value = '';
                    currentFilters.search = '';
                    applyFiltersAndSort();
                });
            }

            searchInput.addEventListener('input', (e) => {
                currentFilters.search = e.target.value.toLowerCase();
                applyFiltersAndSort();
            });
        }

        if (categoryRadios) {
            categoryRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    currentFilters.category = e.target.value;
                    applyFiltersAndSort();
                });
            });
        }

        if (applyPriceFilterBtn) {
            applyPriceFilterBtn.addEventListener('click', () => {
                currentFilters.minPrice = Number(minPriceInput.value) || 0;
                currentFilters.maxPrice = Number(maxPriceInput.value) || Number.MAX_SAFE_INTEGER;
                applyFiltersAndSort();
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                applyFiltersAndSort();
            });
        }

        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => {
                if(productGrid) productGrid.classList.remove('list-view');
                gridViewBtn.classList.add('active');
                if(listViewBtn) listViewBtn.classList.remove('active');
            });
        }

        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => {
                if(productGrid) productGrid.classList.add('list-view');
                listViewBtn.classList.add('active');
                if(gridViewBtn) gridViewBtn.classList.remove('active');
            });
        }

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                if(mainNav) mainNav.classList.add('open');
                if(overlay) overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        if (cartIcon) {
            cartIcon.addEventListener('click', (e) => {
                e.preventDefault();
                renderCart();
                if(cartSidebar) cartSidebar.classList.add('open');
                if(overlay) overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }
        
        if (closeCartBtn) closeCartBtn.addEventListener('click', closeOverlays);

        const wishlistOpenBtn = document.getElementById('wishlistOpenBtn');
        const closeWishlistBtn = document.getElementById('closeWishlistBtn');
        const wishlistSidebar = document.getElementById('wishlistSidebar');

        if (wishlistOpenBtn && wishlistSidebar) {
            wishlistOpenBtn.addEventListener('click', (e) => {
                e.preventDefault();
                renderWishlist();
                wishlistSidebar.classList.add('open');
                if(overlay) overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }
        
        if (closeWishlistBtn) closeWishlistBtn.addEventListener('click', closeOverlays);
        if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeOverlays);
        if (overlay) overlay.addEventListener('click', closeOverlays);

        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                if (cart.length === 0) {
                    showToast("Your bag is empty!");
                    return;
                }
                
                let message = "*New Order from Syeta Fashion*\n\n";
                let total = 0;
                
                cart.forEach((item, index) => {
                    const itemTotal = item.price * item.quantity;
                    total += itemTotal;
                    
                    const path = window.location.pathname;
                    const pageUrl = window.location.origin + path.substring(0, path.lastIndexOf('/'));
                    const imageUrl = `${pageUrl}/${item.image}`;

                    message += `*${index + 1}. ${item.name}*\n`;
                    message += `- Size: ${item.size}\n`;
                    message += `- Qty: ${item.quantity}\n`;
                    message += `- Price: LKR ${item.price.toLocaleString('en-US', {minimumFractionDigits:2})}\n`;
                    message += `- Subtotal: LKR ${itemTotal.toLocaleString('en-US', {minimumFractionDigits:2})}\n\n`;
                });
                
                message += `*Total Amount: LKR ${total.toLocaleString('en-US', {minimumFractionDigits:2})}*\n\n`;
                message += `Please confirm my order.`;
                
                const phoneNumber = "94707949266"; 
                const encodedMessage = encodeURIComponent(message);
                const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
                
                window.open(whatsappUrl, '_blank');
            });
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                if(productModal) productModal.classList.remove('open');
            });
        }

        if (productModal) {
            productModal.addEventListener('click', (e) => {
                if (e.target === productModal) {
                    productModal.classList.remove('open');
                }
            });
        }

        if (modalQtyMinus && modalQtyPlus && modalQty) {
            modalQtyMinus.addEventListener('click', () => {
                let val = parseInt(modalQty.value);
                if (val > 1) modalQty.value = val - 1;
            });

            modalQtyPlus.addEventListener('click', () => {
                modalQty.value = parseInt(modalQty.value) + 1;
            });
        }

        if (modalAddToCartBtn) {
            modalAddToCartBtn.addEventListener('click', () => {
                if (currentModalProduct && modalQty) {
                    const qty = parseInt(modalQty.value);
                    addToCart(currentModalProduct, selectedSize, qty);
                    if(productModal) productModal.classList.remove('open');
                    showToast(`Added ${qty} ${currentModalProduct.name} (Size ${selectedSize}) to bag`);
                }
            });
        }

        if (addToWishlistBtn) {
            addToWishlistBtn.addEventListener('click', () => {
                if (currentModalProduct) {
                    const existing = wishlist.find(item => item.id === currentModalProduct.id);
                    if (existing) {
                        showToast("Item is already in your wishlist!");
                    } else {
                        wishlist.push({ ...currentModalProduct });
                        localStorage.setItem('syeta_wishlist', JSON.stringify(wishlist));
                        updateWishlistCount();
                        renderWishlist();
                        showToast("Added to Wishlist!");
                        if(wishlistSidebar) {
                            wishlistSidebar.classList.add('open');
                            if(overlay) overlay.classList.add('active');
                            document.body.style.overflow = 'hidden';
                            if(productModal) productModal.classList.remove('open');
                        }
                    }
                }
            });
        }
        
        setupAdminDashboard();
        setupWhatsAppFloatingButton();
    }

    function closeOverlays() {
        if(mainNav) mainNav.classList.remove('open');
        if(cartSidebar) cartSidebar.classList.remove('open');
        const wishlistSidebar = document.getElementById('wishlistSidebar');
        if(wishlistSidebar) wishlistSidebar.classList.remove('open');
        if(overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    /* ==========================================================================
       4. Shopping Cart & Wishlist Logic
       ========================================================================== */
    window.addToCart = function(product, size, qty = 1) {
        if (!size) {
            showToast("Please select a size");
            return;
        }

        const existingItemIndex = cart.findIndex(item => item.id === product.id && item.size === size);
        
        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += qty;
        } else {
            cart.push({
                ...product,
                size: size,
                quantity: qty
            });
        }

        localStorage.setItem('syeta_cart', JSON.stringify(cart));
        updateCartCount();
        renderCart();
    }

    window.removeFromCart = function(id, size) {
        cart = cart.filter(item => !(item.id === id && item.size === size));
        localStorage.setItem('syeta_cart', JSON.stringify(cart));
        updateCartCount();
        renderCart();
    }

    function updateCartCount() {
        if (cartBadge) {
            const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
            cartBadge.textContent = totalItems;
            cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    function renderCart() {
        if (!cartItemsContainer || !cartTotalPrice) return;
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Your bag is empty.</div>';
            cartTotalPrice.textContent = 'LKR 0.00';
            return;
        }

        let html = '';
        let total = 0;

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;

            html += `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.src='pictures/Carousel_Placeholder.png'">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-meta">Size: ${item.size}</div>
                        <div class="cart-item-price">${formatCurrency(item.price)}</div>
                        <div class="cart-item-controls">
                            <button class="remove-item" onclick="removeFromCart('${item.id}', '${item.size}')">Remove</button>
                            <span style="font-size: 0.8rem; color: #888; margin-left: auto;">Qty: ${item.quantity}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        cartItemsContainer.innerHTML = html;
        cartTotalPrice.textContent = formatCurrency(total);
    }
    
    function updateWishlistCount() {
        const wBadge = document.getElementById('wishlistCount');
        if (wBadge) {
            wBadge.textContent = wishlist.length;
            wBadge.style.display = wishlist.length > 0 ? 'flex' : 'none';
        }
    }
    
    function renderWishlist() {
        const wishlistItemsContainer = document.getElementById('wishlistItems');
        if (!wishlistItemsContainer) return;
        
        if (wishlist.length === 0) {
            wishlistItemsContainer.innerHTML = '<div class="empty-cart-msg">Your wishlist is empty.</div>';
            return;
        }

        let html = '';
        wishlist.forEach(item => {
            html += `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.src='pictures/Carousel_Placeholder.png'">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-price">${formatCurrency(item.price)}</div>
                        <div class="cart-item-controls" style="justify-content: space-between; margin-top: 10px;">
                            <button class="action-btn" style="padding: 5px 10px; font-size: 0.8rem;" onclick="moveToCart('${item.id}')">Move to Bag</button>
                            <button class="remove-item" onclick="removeFromWishlist('${item.id}')">Remove</button>
                        </div>
                    </div>
                </div>
            `;
        });

        wishlistItemsContainer.innerHTML = html;
    }
    
    window.removeFromWishlist = function(id) {
        wishlist = wishlist.filter(item => item.id !== id);
        localStorage.setItem('syeta_wishlist', JSON.stringify(wishlist));
        updateWishlistCount();
        renderWishlist();
    };

    window.moveToCart = function(id) {
        const item = wishlist.find(i => i.id === id);
        if (item) {
            if (item.sizes && item.sizes.length > 0) {
                addToCart(item, item.sizes[0], 1);
                showToast(`Moved ${item.name} to bag`);
                removeFromWishlist(id);
            } else {
                showToast(`Item currently unavailable`);
            }
        }
    };

    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    /* ==========================================================================
       5. Admin Logic (Direct integration)
       ========================================================================== */
    function setupAdminDashboard() {
        const adminLoginBtn = document.getElementById('footerAdminLoginBtn');
        const adminLoginModal = document.getElementById('adminLoginModal');
        const closeAdminLoginBtn = document.getElementById('closeAdminLoginBtn');
        const adminPasswordInput = document.getElementById('adminPasswordInput');
        const adminLoginSubmitBtn = document.getElementById('adminLoginSubmitBtn');
        
        const adminModal = document.getElementById('adminModal');
        const closeAdminBtn = document.getElementById('closeAdminBtn');
        const adminLogoutBtn = document.getElementById('adminLogoutBtn');
        
        let isAdminLoggedIn = false;
        
        if (adminLoginBtn && adminLoginModal) {
            adminLoginBtn.addEventListener('click', () => {
                if (isAdminLoggedIn) {
                    openAdminDashboard();
                } else {
                    adminLoginModal.classList.add('open');
                }
            });
            
            closeAdminLoginBtn.addEventListener('click', () => {
                adminLoginModal.classList.remove('open');
            });
            
            adminLoginSubmitBtn.addEventListener('click', () => {
                const pass = adminPasswordInput.value;
                if (btoa(pass) === 'bWtzczIwMDRAR21haWwuY29t') {
                    isAdminLoggedIn = true;
                    adminLoginModal.classList.remove('open');
                    openAdminDashboard();
                    showToast("Logged in as Admin");
                } else {
                    showToast("Incorrect password!");
                }
                adminPasswordInput.value = '';
            });
        }
        
        if (closeAdminBtn && adminModal) {
            closeAdminBtn.addEventListener('click', () => {
                adminModal.classList.remove('open');
                applyFiltersAndSort(); // refresh store frontend
            });
        }
        
        if (adminLogoutBtn) {
            adminLogoutBtn.addEventListener('click', () => {
                isAdminLoggedIn = false;
                adminModal.classList.remove('open');
                showToast("Admin logged out");
                applyFiltersAndSort();
            });
        }
        
        // Admin Tabs
        const tabManage = document.getElementById('tabManage');
        const tabAdd = document.getElementById('tabAdd');
        const sectionManage = document.getElementById('adminManageSection');
        const sectionAdd = document.getElementById('adminAddSection');
        
        if (tabManage && tabAdd) {
            tabManage.addEventListener('click', () => {
                sectionManage.style.display = 'block';
                sectionAdd.style.display = 'none';
                tabManage.classList.add('active');
                tabAdd.classList.remove('active');
                
                // Clear any leftover inline styles
                tabManage.style.borderBottom = '';
                tabManage.style.color = '';
                tabAdd.style.borderBottom = '';
                tabAdd.style.color = '';
            });
            
            tabAdd.addEventListener('click', () => {
                sectionManage.style.display = 'none';
                sectionAdd.style.display = 'block';
                tabAdd.classList.add('active');
                tabManage.classList.remove('active');
                
                tabAdd.style.borderBottom = '';
                tabAdd.style.color = '';
                tabManage.style.borderBottom = '';
                tabManage.style.color = '';
            });
        }
        
        function openAdminDashboard() {
            if(adminModal) adminModal.classList.add('open');
            renderAdminTable();
        }
        
        function renderAdminTable() {
            const table = document.getElementById('adminProductTable');
            if(!table) return;
            
            let html = '';
            products.forEach(p => {
                const stockChecked = p.inStock ? 'checked' : '';
                html += `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px 5px;"><img src="${p.image}" style="width:40px; height:50px; object-fit:cover;"></td>
                        <td style="padding:10px 5px; font-weight:500;">${p.name}<br><span style="font-size:0.8rem; color:#888;">LKR ${p.price}</span></td>
                        <td style="padding:10px 5px;">
                            <label class="switch" style="position:relative; display:inline-block; width:50px; height:24px;">
                                <input type="checkbox" style="opacity:0; width:0; height:0;" onchange="toggleStock('${p.id}', this.checked)" ${stockChecked}>
                                <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:${p.inStock ? '#40916c' : '#ccc'}; border-radius:34px; transition:.4s; padding:2px 5px; color:white; font-size:11px; text-align:${p.inStock ? 'left' : 'right'}; user-select:none;">
                                    ${p.inStock ? 'ON' : 'OFF'}
                                </span>
                            </label>
                        </td>
                        <td style="padding:10px 5px;">
                            ${sizes.map(s => `
                                <label style="margin-right:8px; font-size:0.85rem; cursor:pointer;">
                                    <input type="checkbox" ${p.sizes.includes(s) ? 'checked' : ''} onchange="toggleSize('${p.id}', '${s}', this.checked)"> ${s}
                                </label>
                            `).join('')}
                        </td>
                        <td style="padding:10px 5px;">
                            <button onclick="openEditModal('${p.id}')" style="padding:4px 8px; font-size:0.8rem; background:transparent; border:1px solid #333; cursor:pointer;">Edit Details</button>
                        </td>
                    </tr>
                `;
            });
            table.innerHTML = html;
        }
        
        window.toggleStock = function(id, isStockOn) {
            const p = products.find(x => x.id === id);
            if (p) {
                p.inStock = isStockOn;
                adminData.edited[id] = adminData.edited[id] || {};
                adminData.edited[id].inStock = isStockOn;
                localStorage.setItem('syeta_admin_data', JSON.stringify(adminData));
                renderAdminTable();
                showToast(isStockOn ? "Marked In Stock" : "Marked Out of Stock");
            }
        };

        window.toggleSize = function(id, size, isAvailable) {
            const p = products.find(x => x.id === id);
            if (p) {
                if (isAvailable && !p.sizes.includes(size)) p.sizes.push(size);
                if (!isAvailable) p.sizes = p.sizes.filter(s => s !== size);
                
                adminData.edited[id] = adminData.edited[id] || {};
                adminData.edited[id].sizes = p.sizes;
                localStorage.setItem('syeta_admin_data', JSON.stringify(adminData));
            }
        };
        
        // Edit flow
        const editModal = document.getElementById('editProductModal');
        const closeEditModalBtn = document.getElementById('closeEditModalBtn');
        const editForm = document.getElementById('editForm');
        
        if (closeEditModalBtn && editModal) {
            closeEditModalBtn.addEventListener('click', () => editModal.classList.remove('open'));
        }
        
        window.openEditModal = function(id) {
            const p = products.find(x => x.id === id);
            if(p && editModal) {
                document.getElementById('editProductId').value = p.id;
                document.getElementById('editName').value = p.name;
                editModal.classList.add('open');
            }
        };
        
        const photoToBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
        
        if (editForm) {
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                showToast("Saving changes...");
                
                const id = document.getElementById('editProductId').value;
                const newName = document.getElementById('editName').value;
                const photosInput = document.getElementById('editImages');
                const sizeChartInput = document.getElementById('editSizeChart');
                
                const p = products.find(x => x.id === id);
                if (!p) return;
                
                p.name = newName;
                adminData.edited[id] = adminData.edited[id] || {};
                adminData.edited[id].name = newName;
                
                if (photosInput.files.length > 0) {
                    const gallery = [];
                    for (let i = 0; i < photosInput.files.length; i++) {
                        const b64 = await photoToBase64(photosInput.files[i]);
                        gallery.push(b64);
                    }
                    p.image = gallery[0];
                    p.gallery = gallery;
                    adminData.edited[id].gallery = gallery;
                }
                
                if (sizeChartInput.files.length > 0) {
                    const chartB64 = await photoToBase64(sizeChartInput.files[0]);
                    p.sizeChart = chartB64;
                    adminData.edited[id].sizeChart = chartB64;
                }
                
                localStorage.setItem('syeta_admin_data', JSON.stringify(adminData));
                editModal.classList.remove('open');
                renderAdminTable();
                showToast("Product updated successfully!");
            });
        }
        
        // Add new product
        const addForm = document.getElementById('addForm');
        if (addForm) {
            addForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                showToast("Processing photos...");
                
                const id = `prod_added_${Date.now()}`;
                const name = document.getElementById('addName').value;
                const price = Number(document.getElementById('addPrice').value);
                const category = document.getElementById('addCategory').value;
                const photosInput = document.getElementById('addImage');
                const sizeChartInput = document.getElementById('addSizeChart');
                
                const gallery = [];
                for (let i = 0; i < photosInput.files.length; i++) {
                    gallery.push(await photoToBase64(photosInput.files[i]));
                }
                
                let sizeChart = null;
                if (sizeChartInput.files.length > 0) {
                    sizeChart = await photoToBase64(sizeChartInput.files[0]);
                }
                
                const newProd = {
                    id, name, price, category,
                    image: gallery[0],
                    gallery, sizeChart,
                    sizes: [...sizes],
                    inStock: true
                };
                
                products.push(newProd);
                adminData.added.push(newProd);
                localStorage.setItem('syeta_admin_data', JSON.stringify(adminData));
                
                addForm.reset();
                renderAdminTable();
                showToast("New product added!");
                
                if (tabManage) tabManage.click();
            });
        }
    }
    
    function setupWhatsAppFloatingButton() {
        const waFloatBtn = document.getElementById('waFloatingBtn');
        const waPopup = document.getElementById('waPopup');
        const waCloseBtn = document.getElementById('waCloseBtn');
        const waStartChatBtn = document.getElementById('waStartChatBtn');
        const waNameInput = document.getElementById('waNameInput');
        const waPhoneInput = document.getElementById('waPhoneInput');

        if (waFloatBtn && waPopup) {
            waFloatBtn.addEventListener('click', () => {
                waPopup.classList.toggle('open');
            });
        }
        if (waCloseBtn && waPopup) {
            waCloseBtn.addEventListener('click', () => waPopup.classList.remove('open'));
        }

        if (waStartChatBtn) {
            waStartChatBtn.addEventListener('click', () => {
                const name = waNameInput.value.trim();
                const homeTown = waPhoneInput.value.trim();
                
                if (!name || !homeTown) {
                    showToast("Please enter your name and home town");
                    return;
                }

                const message = `Hi, I'm ${name} from ${homeTown}. I'd like to chat with you.`;
                const encodedMessage = encodeURIComponent(message);
                const ownerPhone = "94707949266"; 
                const waUrl = `https://wa.me/${ownerPhone}?text=${encodedMessage}`;
                
                window.open(waUrl, '_blank');
                waPopup.classList.remove('open');
            });
        }
    }

    // Google Sign in (Dummy implementation for UI)
    window.handleGoogleSign = function(response) {
        showToast("Signed in with Google successfully!");
    }

    // Execute application load
    init();
});
