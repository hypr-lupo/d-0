from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import pyperclip

# =====================================================
# CONFIGURACIÓN DE CHROME
# =====================================================

PROFILE_PATH = r"C:\selenium_profiles\vsaas"
URL = (
    "https://suite.vsaas.ai/member/project/"
    "5c8c7a0ab8bee20010628454/events/"
    "dashboard/608340257f81b985de485d15/management"
)

chrome_options = Options()
chrome_options.add_argument(f"--user-data-dir={PROFILE_PATH}")
chrome_options.add_argument("--start-maximized")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--remote-debugging-port=9222")
chrome_options.add_argument("--disable-extensions")

# =====================================================
# INICIAR DRIVER
# =====================================================

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=chrome_options
)

driver.get(URL)
wait = WebDriverWait(driver, 60)

# =====================================================
# FUNCIÓN UTILITARIA
# =====================================================

def obtener_h3():
    """Obtiene el h3 del evento (Angular puede recrearlo)."""
    return wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "h3.ng-binding"))
    )

# =====================================================
# INICIALIZACIÓN
# =====================================================

h3 = obtener_h3()
ultimo_codigo = None

print("Sistema activo. Cambia de alerta para copiar el código.")

# =====================================================
# LOOP DE OBSERVACIÓN
# =====================================================

while True:
    try:
        texto = h3.text.strip()

        if "|" not in texto:
            time.sleep(0.3)
            continue

        codigo_actual = texto.split("|")[-1].strip()

        # Evita copiar el mismo código repetidamente
        if codigo_actual != ultimo_codigo:
            ultimo_codigo = codigo_actual
            pyperclip.copy(codigo_actual)
            print(f"Código copiado al portapapeles: {codigo_actual}")

        time.sleep(0.3)

    except Exception:
        # Angular reemplazó el nodo → lo volvemos a capturar
        h3 = obtener_h3()
