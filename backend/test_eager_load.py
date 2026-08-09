import subprocess
import time
import requests
import sys

def run_test():
    print("Starting uvicorn server in background...")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8085"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    start_time = time.time()
    success = False
    
    # Immediately start polling
    for i in range(20):
        try:
            print(f"[{time.time() - start_time:.1f}s] Attempting to hit /api/v1/health...")
            resp = requests.get("http://localhost:8085/api/v1/health", timeout=0.5)
            if resp.status_code == 200:
                print(f"[{time.time() - start_time:.1f}s] Server responded successfully! Server is up.")
                success = True
                break
        except requests.exceptions.ConnectionError:
            print(f"[{time.time() - start_time:.1f}s] Connection refused - server still blocked in eager load startup")
        except requests.exceptions.Timeout:
            print(f"[{time.time() - start_time:.1f}s] Request timed out - server still blocked in eager load startup")
            
        time.sleep(0.5)
        
    proc.terminate()
    proc.wait()
    
    print("\n--- Uvicorn Output ---")
    out, err = proc.communicate()
    print(err) # uvicorn logs to stderr mostly
    print(out)
    
if __name__ == "__main__":
    run_test()
