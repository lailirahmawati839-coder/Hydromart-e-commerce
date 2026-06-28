// 1. Konfigurasi Supabase (Gunakan URL dan KEY milikmu sendiri)
const SUPABASE_URL = 'https://tjvxqubbsawvstmcpebu.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_F-96vYKWKPR-XUihoi5hTA_wYfEFqwa'; // <--- PASTIKAN INI KEY LENGKAP KAMU YANG TADI

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Status Halaman (Mulai dari mode Login/Masuk)
let isSignUp = false;

// 3. Fungsi Hidup-Mati (Toggle) Kolom Pendaftaran
function toggleAuthMode() {
    isSignUp = !isSignUp;
    
    const authTitle = document.getElementById('auth-title');
    const registerFields = document.getElementById('register-fields');
    const submitBtn = document.getElementById('submit-btn');
    const toggleText = document.getElementById('toggle-text');
    const toggleBtn = document.getElementById('toggle-btn');

    if (isSignUp) {
        authTitle.innerText = 'Daftar Akun HydroMart';
        registerFields.classList.remove('hidden');
        submitBtn.innerText = 'Daftar Sekarang';
        toggleText.innerText = 'Sudah punya akun?';
        toggleBtn.innerText = 'Masuk di sini';
    } else {
        authTitle.innerText = 'Masuk ke HydroMart';
        registerFields.classList.add('hidden');
        submitBtn.innerText = 'Masuk';
        toggleText.innerText = 'Belum punya akun?';
        toggleBtn.innerText = 'Daftar Sekarang';
    }
}

// 4. Fungsi Proses Login & Daftar ke Database Supabase
async function handleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    if (isSignUp) {
        // PROSES DAFTAR (SIGN UP)
        const name = document.getElementById('auth-name').value;
        const role = document.getElementById('auth-role').value;
        
        if (!name) {
            alert('Nama tidak boleh kosong!');
            return;
        }

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    role: role
                }
            }
        });

        if (error) {
            alert('Pendaftaran Gagal: ' + error.message);
        } else {
            alert('Pendaftaran Berhasil! Silakan masuk menggunakan akun baru Anda.');
            toggleAuthMode(); // Kembalikan ke mode login
        }
    } else {
        // PROSES LOGIN (SIGN IN)
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            alert('Login Gagal: ' + error.message);
        } else {
            alert('Login Berhasil!');
            // Cek peran untuk mengarahkan halaman
            const userRole = data.user.user_metadata.role;
            if (userRole === 'vendor') {
                window.location.href = 'vendor.html';
            } else {
                window.location.href = 'index.html';
            }
        }
    }
}

// 5. Fungsi Cek Sesi Aktif
async function checkUserSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        console.log('User sudah login:', session.user);
    }
}
