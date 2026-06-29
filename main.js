// ============================================
// KONFIGURASI GLOBAL (WAJIB DI PALING ATAS)
// ============================================
const SUPABASE_URL = "https://tjvxqubbsawvstmcpebu.supabase.co";
const SUPABASE_KEY = "sb_publishable_F-96vYKWKPR-XUihoi5hTA_wYfEFqwa"; 

// DISINI DIUBAH: Menggunakan nama 'supabaseClient' agar tidak bentrok dengan CDN html
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Dua variabel status ini harus ada di sini (di luar fungsi) agar bisa dibaca semua sistem
let currentMode = 'login';
let currentUserId = null;

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

        // 1. Buat User baru di sistem autentikasi
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });
        if (authError) return alert("Pendaftaran Gagal: " + authError.message);

        if (authData.user) {
            // 2. Simpan profil tambahan (Role & Nama Lengkap)
            const { error: profileError } = await supabaseClient.from('profiles').insert([
                { id: authData.user.id, full_name: fullName, role: role }
            ]);
            if (profileError) alert("Gagal menyimpan profil: " + profileError.message);
            alert("Pendaftaran Berhasil! Silakan masuk.");
            toggleAuthMode();
        }
    } else {
        // Mode LOGIN
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) return alert("Login gagal, cek kembali email/password: " + error.message);

        // Arahkan halaman sesuai Role (Vendor vs Pembeli)
        const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', data.user.id).single();
        if (profile && profile.role === 'vendor') {
            window.location.href = 'vendor.html';
        } else {
            window.location.href = 'index.html';
        }
    }
}

async function checkUserSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUserId = session.user.id;
        document.getElementById('login-nav-btn')?.classList.add('hidden');
        document.getElementById('logout-btn')?.classList.remove('hidden');
        
        const { data: profile } = await supabaseClient.from('profiles').select('full_name, role').eq('id', currentUserId).single();
        if (profile) {
            const userDisplay = document.getElementById('user-display');
            if (userDisplay) {
                userDisplay.innerText = `${profile.full_name} (${profile.role.toUpperCase()})`;
            }
            if(profile.role === 'pembeli') fetchPembeliTracking();
        }
    }
}

async function protectVendorPage() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = 'login.html'; return; }
    currentUserId = session.user.id;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUserId).single();
    if (!profile || profile.role !== 'vendor') {
        alert("Akses ditolak! Halaman ini khusus Vendor Mitra.");
        window.location.href = 'index.html';
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

    // Pastikan di bawah ini menggunakan supabaseClient
    let { data: products, error } = await supabaseClient.from('products').select('*');
    if (error || !products) return;

    if (grid) grid.innerHTML = '';
    if (adContainer) adContainer.innerHTML = '';

    let adCount = 0;

    products.forEach(item => {
        if (grid) {
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
                        <button onclick="beliProductDirect(${item.id}, '${item.vendor_id}', ${item.price})" class="w-full bg-orange-500 hover:bg-orange-600 text-white py-1.5 rounded-lg text-xs font-bold transition">Beli Instan</button>
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
    e.preventDefault();
    const name = document.getElementById('v-name').value;
    const category = document.getElementById('v-category').value;
    const price = document.getElementById('v-price').value;
    const stock = document.getElementById('v-stock').value;
    const image_url = document.getElementById('v-image').value;
    const is_featured = document.getElementById('v-featured').checked;

    const { error } = await supabase.from('products').insert([
        { vendor_id: currentUserId, name, category, price, stock, image_url, is_featured }
    ]);

    if (error) alert("Gagal mengupload: " + error.message);
    else { alert("Sukses! Produk terpasang di etalase pasar."); document.getElementById('vendor-product-form').reset(); }
}

// ============================================
// SYSTEM 3: FITUR BELI DAN PELACAKAN BARANG
// ============================================
async function beliProductDirect(productId, vendorId, price) {
    if (!currentUserId) return alert("Silakan Login akun pembeli terlebih dahulu!");

    const { error } = await supabase.from('orders').insert([
        { pembeli_id: currentUserId, vendor_id: vendorId, product_id: productId, quantity: 1, total_price: price, status: 'Diproses', resi_number: 'Belum Ada' }
    ]);

    if (error) alert("Transaksi gagal: " + error.message);
    else { alert("Pesanan Berhasil Dibuat! Cek status kirim di tabel tracking bawah."); window.location.reload(); }
}

async function fetchPembeliTracking() {
    const tbody = document.getElementById('tracking-table-body');
    if (!tbody) return;
    
    let { data: orders, error } = await supabase.from('orders').select('*, products(name), profiles:vendor_id(full_name)').eq('pembeli_id', currentUserId);
    if(error || !orders) return;

    tbody.innerHTML = '';
    if(orders.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400">Belum memiliki riwayat order barang.</td></tr>`; return; }

    orders.forEach(order => {
        let statusColor = order.status === 'Diproses' ? 'bg-amber-100 text-amber-800' : order.status === 'Dikirim' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 font-semibold">${order.products?.name || 'Alat Air'}</td>
                <td class="p-3 text-gray-600">${order.profiles?.full_name || 'Mitra Toko'}</td>
                <td class="p-3 font-bold text-orange-600">Rp ${Number(order.total_price).toLocaleString('id-ID')}</td>
                <td class="p-3 font-mono text-gray-700">${order.resi_number}</td>
                <td class="p-3"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${statusColor}">${order.status}</span></td>
            </tr>
        `;
    });
}

async function fetchVendorOrders() {
    const tbody = document.getElementById('vendor-orders-table');
    if (!tbody) return;

    let { data: orders, error } = await supabase.from('orders').select('*, products(name)').eq('vendor_id', currentUserId);
    if(error || !orders) return;

    tbody.innerHTML = '';
    orders.forEach(order => {
        tbody.innerHTML += `
            <tr class="border-b">
                <td class="p-3 font-bold text-gray-800">${order.products?.name}</td>
                <td class="p-3">${order.quantity} Pcs</td>
                <td class="p-3"><input type="text" id="resi-${order.id}" value="${order.resi_number}" class="border p-1 text-xs w-32 rounded"></td>
                <td class="p-3">
                    <select id="status-${order.id}" class="border p-1 text-xs rounded">
                        <option value="Diproses" ${order.status==='Diproses'?'selected':''}>Diproses</option>
                        <option value="Dikirim" ${order.status==='Dikirim'?'selected':''}>Dikirim (Di Kurir)</option>
                        <option value="Selesai" ${order.status==='Selesai'?'selected':''}>Selesai Diterima</option>
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

    const { error } = await supabase.from('orders').update({ resi_number: resi, status: status }).eq('id', orderId);
    if(error) alert("Gagal update tracking!");
    else { alert("Status Tracking Berhasil Diperbarui!"); fetchVendorOrders(); }
}
