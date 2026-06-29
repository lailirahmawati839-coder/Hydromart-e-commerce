// ============================================
// KONFIGURASI GLOBAL (WAJIB DI PALING ATAS)
// ============================================
const SUPABASE_URL = "https://tjvxqubbsawvstmcpebu.supabase.co";
const SUPABASE_KEY = "sb_publishable_F-96vYKWKPR-XUihoi5hTA_wYfEFqwa"; 

// Menggunakan nama 'supabaseClient' agar tidak bentrok dengan CDN bawaan html
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variabel status global
let currentMode = 'login';
let currentUserId = null;

// VARIABEL BARU: Array penampung item keranjang sebelum checkout
let keranjangBelanja = [];

// ============================================
// SYSTEM 1: MANAGEMEN AKUN LOGIN/REGISTER
// ============================================
function toggleAuthMode() {
    const fields = document.getElementById('register-fields');
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('submit-btn');
    const toggleBtn = document.getElementById('toggle-btn');
    const toggleText = document.getElementById('toggle-text');

    if (currentMode === 'login') {
        currentMode = 'register';
        if (fields) fields.classList.remove('hidden');
        if (title) title.innerText = "Daftar Akun Hydromart";
        if (submitBtn) submitBtn.innerText = "Daftar Toko / Pembeli";
        if (toggleBtn) toggleBtn.innerText = "Login di sini";
        if (toggleText) toggleText.innerText = "Sudah punya akun?";
    } else {
        currentMode = 'login';
        if (fields) fields.classList.add('hidden');
        if (title) title.innerText = "Masuk ke HydroMart";
        if (submitBtn) submitBtn.innerText = "Masuk";
        if (toggleBtn) toggleBtn.innerText = "Daftar Sekarang";
        if (toggleText) toggleText.innerText = "Belum punya akun?";
    }
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (currentMode === 'register') {
        const fullName = document.getElementById('auth-name').value;
        const role = document.getElementById('auth-role').value;

        // Menyimpan Nama & Role langsung ke dalam Metadata akun bawaan Supabase
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({ 
            email, 
            password,
            options: {
                data: { full_name: fullName, role: role }
            }
        });
        
        if (authError) return alert("Pendaftaran Gagal: " + authError.message);
        alert("Pendaftaran Berhasil! Silakan langsung login masuk.");
        toggleAuthMode();
        
    } else {
        // Mode LOGIN
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) return alert("Login gagal, cek kembali email/password: " + error.message);

        alert("Login Berhasil!");
        window.location.href = 'index.html';
    }
}

async function checkUserSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    const pembeliSec = document.getElementById('pembeli-section');
    const vendorSec = document.getElementById('vendor-section');

    if (session) {
        currentUserId = session.user.id;
        
        if (document.getElementById('login-nav-btn')) document.getElementById('login-nav-btn').classList.add('hidden');
        if (document.getElementById('logout-btn')) document.getElementById('logout-btn').classList.remove('hidden');
        
        const userMetadata = session.user.user_metadata;
        const fullName = userMetadata?.full_name || "User Mitra";
        const role = userMetadata?.role || "pembeli"; 
        
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) {
            userDisplay.innerText = `${fullName} (${role.toUpperCase()})`;
        }

        if (role === 'vendor') {
            if (vendorSec) vendorSec.classList.remove('hidden');
            if (pembeliSec) pembeliSec.classList.add('hidden');
            document.getElementById('cart-float-btn')?.classList.add('hidden'); // Sembunyikan keranjang dari vendor
            fetchVendorOrders(); 
        } else {
            if (pembeliSec) pembeliSec.classList.remove('hidden');
            if (vendorSec) vendorSec.classList.add('hidden');
            document.getElementById('cart-float-btn')?.classList.remove('hidden'); // Tampilkan keranjang untuk pembeli
            fetchMarketProducts();
            fetchPembeliTracking();
        }
    } else {
        if (pembeliSec) pembeliSec.classList.remove('hidden');
        if (vendorSec) vendorSec.classList.add('hidden');
        document.getElementById('cart-float-btn')?.classList.add('hidden');
        fetchMarketProducts();
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// ============================================
// SYSTEM 2: FITUR KATALOG PASAR & IKLAN BANNER
// ============================================
async function fetchMarketProducts() {
    const grid = document.getElementById('product-grid');
    const adContainer = document.getElementById('featured-ads');

    let { data: products, error } = await supabaseClient.from('products').select('*');
    if (error || !products) return;

    if (grid) grid.innerHTML = '';
    if (adContainer) adContainer.innerHTML = '';

    let adCount = 0;

    products.forEach(item => {
        if (grid) {
            // DIUBAH: Fungsi tombol diubah dari beliProductDirect menjadi tambahKeKeranjang
            grid.innerHTML += `
                <div class="bg-white p-3 rounded-xl shadow hover:shadow-md transition flex flex-col justify-between">
                    <div>
                        <img src="${item.image_url}" class="w-full h-32 object-contain bg-gray-50 rounded-lg p-1">
                        <h3 class="font-bold text-sm mt-2 text-gray-800 line-clamp-2">${item.name}</h3>
                        <p class="text-[11px] text-gray-400 mt-0.5">${item.category}</p>
                    </div>
                    <div class="mt-4">
                        <p class="text-orange-600 font-extrabold text-base">Rp ${Number(item.price).toLocaleString('id-ID')}</p>
                        <p class="text-[10px] text-gray-500 mb-2">Stok: ${item.stock}</p>
                        <button onclick="tambahKeKeranjang(${item.id}, '${item.name}', ${item.price}, '${item.vendor_id}')" class="w-full bg-orange-50 hover:bg-orange-600 text-white py-1.5 rounded-lg text-xs font-bold transition">🛒 Masukkan Keranjang</button>
                    </div>
                </div>
            `;
        }

        if (item.is_featured && adContainer && adCount < 2) {
            adContainer.innerHTML += `
                <div class="bg-white text-gray-800 p-2.5 rounded-xl flex items-center space-x-3 w-40 shadow">
                    <img src="${item.image_url}" class="w-12 h-12 object-contain">
                    <div>
                        <h4 class="font-bold text-xs line-clamp-1">${item.name}</h4>
                        <p class="text-orange-600 font-extrabold text-[11px]">Rp ${Number(item.price).toLocaleString('id-ID')}</p>
                    </div>
                </div>
            `;
            adCount++;
        }
    });
}

async function vendorSaveProduct(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('v-name').value;
    const category = document.getElementById('v-category').value;
    const price = document.getElementById('v-price').value;
    const stock = document.getElementById('v-stock').value;
    const image_url = document.getElementById('v-image').value;
    const is_featured = document.getElementById('v-featured').checked;

    const { error } = await supabaseClient.from('products').insert([
        { vendor_id: currentUserId, name, category, price, stock, image_url, is_featured }
    ]);

    if (error) {
        alert("Gagal mengupload: " + error.message);
    } else { 
        alert("Sukses! Produk terpasang di etalase pasar."); 
        document.getElementById('vendor-product-form').reset();
        checkUserSession(); 
    }
}

// ============================================
// SYSTEM 3: CORE LOGIKAL KERANJANG & CHECKOUT (BARU)
// ============================================
function tambahKeKeranjang(id, name, price, vendorId) {
    if (!currentUserId) return alert("Silakan Login akun pembeli terlebih dahulu!");

    // Cek apakah item sudah pernah dimasukkan ke dalam keranjang
    const itemAda = keranjangBelanja.find(item => item.productId === id);
    if (itemAda) {
        itemAda.quantity += 1; // Jika ada, tambahkan jumlah beli (+1)
    } else {
        // Jika belum ada, masukkan data baru ke dalam array
        keranjangBelanja.push({ productId: id, name, price, vendorId, quantity: 1 });
    }
    
    alert(`Berhasil memasukkan "${name}" ke dalam keranjang belanja!`);
    updateCartVisuals();
}

function updateCartVisuals() {
    const countBadge = document.getElementById('cart-count');
    const itemsList = document.getElementById('cart-items-list');
    const formSection = document.getElementById('cart-form-section');
    const totalDisplay = document.getElementById('cart-total-price');
    
    // Perbarui angka counter bulat merah di tombol floating luar
    if (countBadge) countBadge.innerText = keranjangBelanja.reduce((sum, item) => sum + item.quantity, 0);
    if (!itemsList) return;

    if (keranjangBelanja.length === 0) {
        itemsList.innerHTML = `<p class="text-gray-500 text-center py-4">Keranjangmu masih kosong.</p>`;
        formSection?.classList.add('hidden');
        return;
    }

    formSection?.classList.remove('hidden');
    itemsList.innerHTML = '';
    
    let totalSemua = 0;

    // Looping menampilkan barang di dalam modal kotak popup
    keranjangBelanja.forEach((item, index) => {
        let totalItem = item.price * item.quantity;
        totalSemua += totalItem;

        itemsList.innerHTML += `
            <div class="flex items-center justify-between border-b pb-3 bg-gray-50 p-2 rounded-xl">
                <div>
                    <h4 class="font-bold text-sm text-gray-800">${item.name}</h4>
                    <p class="text-xs text-orange-600 font-extrabold">Rp ${item.price.toLocaleString('id-ID')}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="ubahJumlahItem(${index}, -1)" class="bg-gray-200 px-2 py-0.5 rounded text-xs font-bold hover:bg-gray-300">-</button>
                    <span class="text-sm font-bold w-6 text-center">${item.quantity}</span>
                    <button onclick="ubahJumlahItem(${index}, 1)" class="bg-gray-200 px-2 py-0.5 rounded text-xs font-bold hover:bg-gray-300">+</button>
                </div>
            </div>
        `;
    });

    if (totalDisplay) totalDisplay.innerText = `Rp ${totalSemua.toLocaleString('id-ID')}`;
}

function ubahJumlahItem(index, perubahan) {
    keranjangBelanja[index].quantity += perubahan;
    if (keranjangBelanja[index].quantity <= 0) {
        keranjangBelanja.splice(index, 1); // Jika jumlah 0, hapus dari daftar belanja
    }
    updateCartVisuals();
}

function openCartModal() { document.getElementById('cart-modal')?.classList.remove('hidden'); updateCartVisuals(); }
function closeCartModal() { document.getElementById('cart-modal')?.classList.add('hidden'); }

async function checkoutKeranjang() {
    const alamat = document.getElementById('cart-alamat').value;
    const pembayaran = document.getElementById('cart-pembayaran').value;

    if (!alamat.trim()) return alert("Wajib mengisi alamat pengiriman barang sipil air!");

    // Proses unggah satu per satu isi keranjang ke database Supabase
    for (let item of keranjangBelanja) {
        let totalHargaItem = item.price * item.quantity;
        
        await supabaseClient.from('orders').insert([
            { 
                pembeli_id: currentUserId, 
                vendor_id: item.vendorId, 
                product_id: item.productId, 
                quantity: item.quantity, 
                total_price: totalHargaItem, 
                status: 'Diproses', 
                // Alamat dan metode pembayaran disimpan rapi di dalam kolom resi pengiriman untuk dipantau vendor
                resi_number: `Metode: ${pembayaran} | Alamat: ${alamat}` 
            }
        ]);
    }

    alert(`Checkout Sukses!\nAlamat: ${alamat}\nPembayaran via: ${pembayaran}\nSilakan tunggu barang dikirim oleh vendor.`);
    keranjangBelanja = []; // Bersihkan isi keranjang belanja
    closeCartModal();
    window.location.reload();
}

// ============================================
// SYSTEM 4: PELACAKAN TRANSAKSI & STATUS VENDOR
// ============================================
async function fetchPembeliTracking() {
    const tbody = document.getElementById('tracking-table-body');
    if (!tbody) return;
    
    let { data: orders, error } = await supabaseClient.from('orders').select('*, products(name)').eq('pembeli_id', currentUserId);
    if(error || !orders) return;

    tbody.innerHTML = '';
    if(orders.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400">Belum memiliki riwayat order barang.</td></tr>`; return; }

    orders.forEach(order => {
        let statusColor = order.status === 'Diproses' ? 'bg-amber-100 text-amber-800' : order.status === 'Dikirim' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 font-semibold">${order.products?.name || 'Alat Air'}</td>
                <td class="p-3 text-gray-500">${order.quantity} Pcs</td>
                <td class="p-3 font-bold text-orange-600">Rp ${Number(order.total_price).toLocaleString('id-ID')}</td>
                <td class="p-3 text-xs text-gray-600 font-mono">${order.resi_number}</td>
                <td class="p-3"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${statusColor}">${order.status}</span></td>
            </tr>
        `;
    });
}

async function fetchVendorOrders() {
    const tbody = document.getElementById('vendor-orders-table');
    if (!tbody) return;

    let { data: orders, error } = await supabaseClient.from('orders').select('*, products(name)').eq('vendor_id', currentUserId);
    if(error || !orders) return;

    tbody.innerHTML = '';
    if(orders.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400">Belum ada pesanan masuk ke tokomu.</td></tr>`; return; }

    orders.forEach(order => {
        tbody.innerHTML += `
            <tr class="border-b">
                <td class="p-3 font-bold text-gray-800">${order.products?.name}</td>
                <td class="p-3">${order.quantity} Pcs</td>
                <td class="p-3"><input type="text" id="resi-${order.id}" value="${order.resi_number}" class="border p-1 text-xs w-32 rounded"></td>
                <td class="p-3">
                    <select id="status-${order.id}" class="border p-1 text-xs rounded">
                        <option value="Diproses" ${order.status==='Diproses'?'selected':''}>Diproses</option>
                        <option value="Dikirim" ${order.status==='Dikirim'?'selected':''}>Dikirim</option>
                        <option value="Selesai" ${order.status==='Selesai'?'selected':''}>Selesai</option>
                    </select>
                </td>
                <td class="p-3"><button onclick="updateTrackingByVendor(${order.id})" class="bg-blue-600 text-white px-2 py-1 rounded text-[11px] font-bold">Update</button></td>
            </tr>
        `;
    });
}

async function updateTrackingByVendor(orderId) {
    const resi = document.getElementById(`resi-${orderId}`).value;
    const status = document.getElementById(`status-${orderId}`).value;

    const { error } = await supabaseClient.from('orders').update({ resi_number: resi, status: status }).eq('id', orderId);
    if(error) alert("Gagal update tracking!");
    else { alert("Status Tracking Berhasil Diperbarui!"); fetchVendorOrders(); }
}
