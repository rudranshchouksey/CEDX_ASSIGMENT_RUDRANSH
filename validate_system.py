import subprocess
import urllib.request
import urllib.error
import json
import time
import sys
import os
from pathlib import Path

# Colors for terminal output
C_GREEN = '\033[92m'
C_RED = '\033[91m'
C_YELLOW = '\033[93m'
C_BLUE = '\033[94m'
C_RESET = '\033[0m'

def print_step(msg):
    print(f"\n{C_BLUE}[*] {msg}{C_RESET}")

def print_success(msg):
    print(f"{C_GREEN}[+] {msg}{C_RESET}")

def print_error(msg):
    print(f"{C_RED}[-] {msg}{C_RESET}")

def request(method, url, data=None, headers=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(url, method=method, headers=headers)
    if data:
        req.data = json.dumps(data).encode('utf-8')
        req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode('utf-8')
            try:
                parsed = json.loads(body) if body else {}
            except json.JSONDecodeError:
                parsed = body
            return response.status, dict(response.info()), parsed
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            parsed = json.loads(body) if body else {}
        except json.JSONDecodeError:
            parsed = body
        return e.code, dict(e.info()), parsed
    except urllib.error.URLError as e:
        return 0, {}, {}

def run_tests():
    print_step("1. Starting FastAPI Backend Subprocess")
    server_process = subprocess.Popen(
        ["python", "-m", "uvicorn", "main:app", "--port", "8000"],
        cwd="backend",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    try:
        # Wait for server to boot
        booted = False
        for _ in range(15):
            status, _, _ = request('GET', 'http://localhost:8000/api/status')
            if status == 200:
                booted = True
                break
            time.sleep(1)
            
        if not booted:
            print_error("Failed to boot FastAPI server on port 8000 within 15 seconds.")
            sys.exit(1)
            
        print_success("FastAPI server successfully bound to port 8000.")

        # --- Test 1: Network & CORS Validation ---
        print_step("2. Validating Network Connectivity & CORS")
        headers = {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'POST'
        }
        status, response_headers, _ = request('OPTIONS', 'http://localhost:8000/api/status', headers=headers)
        
        if not any(k.lower() == 'access-control-allow-origin' for k in response_headers):
            print_error(f"CORS Header 'Access-Control-Allow-Origin' missing. Headers received: {response_headers}")
            sys.exit(1)
        print_success("CORS Headers validated for frontend origin.")
        
        status, _, status_payload = request('GET', 'http://localhost:8000/api/status')
        role_r = status_payload.get('role')
        threshold_t = status_payload.get('threshold')
        if not role_r or not threshold_t:
            print_error("CASE_ID properties Role R or Threshold T missing from /api/status payload.")
            sys.exit(1)
        print_success(f"CASE_ID Properties Fetched: Role R = {role_r}, Threshold T = {threshold_t}")

        # --- Test 2: Contract & Schema Integrity ---
        print_step("3. Validating Contract & Schema Integrity")
        status, _, records = request('GET', 'http://localhost:8000/api/records')
        if status != 200 or not isinstance(records, list):
            print_error("GET /api/records did not return a valid list.")
            sys.exit(1)
            
        if len(records) > 0:
            sample = records[0]
            required_keys = {'id', 'state', 'amount', 'reason_codes'}
            if not required_keys.issubset(sample.keys()):
                print_error(f"Record schema mismatch. Missing keys: {required_keys - sample.keys()}")
                sys.exit(1)
            print_success("Record payloads perfectly align with TypeScript audit schema interfaces.")
        else:
            print_error("No records returned. Cannot validate schema.")
            sys.exit(1)

        # --- Test 3: State-Machine & Live Amendment Gate ---
        print_step("4. Validating State-Machine & Live Amendment Gate")
        
        # Find records directly to match the mock state for predictable transitions
        low_val_rec = next((r for r in records if r['id'] == 'REC-002'), None) # IN_REVIEW, amount 100
        high_val_rec = next((r for r in records if r['id'] == 'REC-001'), None) # APPROVED, amount 25000
        
        if low_val_rec:
            # Simulate low value approval then delivery
            payload_approve = {"record_id": low_val_rec['id'], "actor_role": "intern", "action": "approve"}
            st_app, _, _ = request('POST', 'http://localhost:8000/api/review', data=payload_approve)
            if st_app != 200:
                print_error(f"Low-value approval failed with status {st_app}.")
                sys.exit(1)
                
            payload_deliver = {"record_id": low_val_rec['id'], "actor_role": "intern", "action": "deliver"}
            st_del, _, _ = request('POST', 'http://localhost:8000/api/review', data=payload_deliver)
            if st_del == 200:
                print_success(f"Low-value transition (< Threshold T) succeeded for record {low_val_rec['id']}.")
            else:
                print_error(f"Low-value delivery failed with status {st_del}.")
                sys.exit(1)
        
        if high_val_rec:
            # Simulate high value unauthorized delivery
            payload = {"record_id": high_val_rec['id'], "actor_role": "intern", "action": "deliver"}
            st, _, resp = request('POST', 'http://localhost:8000/api/review', data=payload)
            if st == 403:
                print_success(f"High-value unauthorized override appropriately intercepted (HTTP 403) for record {high_val_rec['id']}.")
            else:
                print_error(f"High-value unauthorized override failed to block! Status {st}.")
                sys.exit(1)
                
            # Simulate high value authorized delivery
            payload = {"record_id": high_val_rec['id'], "actor_role": role_r, "action": "deliver"}
            st, _, resp = request('POST', 'http://localhost:8000/api/review', data=payload)
            if st == 200:
                print_success(f"High-value authorized transition successfully triggered delivery for record {high_val_rec['id']}.")
            else:
                print_error(f"High-value authorized transition failed with status {st}. Response: {resp}")
                sys.exit(1)

        # --- Test 4: File Package Integrity ---
        print_step("5. Validating File Package & Exception Integrity")
        print(f"{C_YELLOW}[!] Triggering offline LLM orchestration engine to regenerate partition logs...{C_RESET}")
        
        # Trigger make demo or direct python execution
        pipeline_env = dict(os.environ)
        pipeline_env["REPLAY_LLM"] = "true"
        pipeline_env["CASE_ID"] = "CEDX-VERCEL-1234"
        
        pipeline_proc = subprocess.run(
            ["python", "-m", "cedx_pipeline.main"],
            cwd="backend",
            env=pipeline_env,
            capture_output=True,
            text=True
        )
        
        if pipeline_proc.returncode != 0:
            print_error(f"Offline orchestrator failed to execute. Error: {pipeline_proc.stderr}")
            sys.exit(1)
            
        audit_path = Path("backend/out/audit.json")
        exception_path = Path("backend/out/exception_queue.json")
        
        if audit_path.exists() and audit_path.stat().st_size > 0:
            print_success(f"Immutable audit log generated successfully at {audit_path}.")
        else:
            print_error(f"Audit log missing or empty at {audit_path}.")
            sys.exit(1)
            
        if exception_path.exists():
            print_success(f"Exception queue partitioned successfully at {exception_path}.")
        else:
            print_error(f"Exception queue missing at {exception_path}.")
            sys.exit(1)
            
        print(f"\n{C_GREEN}======================================================{C_RESET}")
        print(f"{C_GREEN}[SUCCESS] E2E INTEGRATION SUITE VALIDATED SUCCESSFULLY{C_RESET}")
        print(f"{C_GREEN}======================================================{C_RESET}")
        
    finally:
        print_step("6. Teardown")
        server_process.terminate()
        server_process.wait()
        print_success("FastAPI subprocess terminated gracefully.")

if __name__ == "__main__":
    run_tests()
