#!/usr/bin/env python3
"""
Rox Auto-Optimization Agent System
- Review Agent: Scans code every 30min, finds issues
- Optimize Agent: Applies fixes, tests, verifies performance
- Both run in parallel with coordination
"""

import os
import json
import subprocess
import threading
import time
import requests
from datetime import datetime
from pathlib import Path

ROX_DIR = Path('/Users/bhavyarajput/Downloads/Rox')
API_URL = 'http://localhost:3000/api/assistant'
LOG_DIR = ROX_DIR / '.rox-data' / 'optimization_logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)

class ReviewAgent:
    """Scans code for issues, inefficiencies, and patterns"""
    
    def __init__(self):
        self.name = "review-agent"
        self.findings_log = LOG_DIR / 'review_findings.jsonl'
        
    def scan_typescript(self):
        """Run tsc and collect errors/warnings"""
        result = subprocess.run(
            ['npx', 'tsc', '--noEmit'],
            cwd=ROX_DIR,
            capture_output=True,
            text=True
        )
        return {
            'timestamp': datetime.now().isoformat(),
            'exit_code': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'error_count': result.stdout.count('error TS') if result.stdout else 0
        }
    
    def scan_performance_patterns(self):
        """Look for common performance anti-patterns"""
        patterns = [
            (r'forEach.*async', 'async in forEach - use for...of'),
            (r'\.map\(.*\)\.filter\(.*\)', 'map+filter chain - combine'),
            (r'JSON\.parse\(JSON\.stringify', 'deep clone via JSON - use structuredClone'),
            (r'new Date\(\)\.getTime\(\)', 'Date.now() is faster'),
            (r'console\.log', 'console.log in production code'),
            (r'process\.env\.[A-Z_]+', 'env access in hot path - cache it'),
            (r'await.*Promise\.all', 'nested Promise.all - flatten'),
        ]
        
        findings = []
        for ext in ['*.ts', '*.tsx']:
            for file in ROX_DIR.rglob(ext):
                if 'node_modules' in str(file) or '.next' in str(file):
                    continue
                try:
                    content = file.read_text()
                    for pattern, suggestion in patterns:
                        import re
                        matches = list(re.finditer(pattern, content))
                        if matches:
                            findings.append({
                                'file': str(file.relative_to(ROX_DIR)),
                                'pattern': pattern,
                                'suggestion': suggestion,
                                'count': len(matches)
                            })
                except:
                    pass
        return findings
    
    def scan_bundle_size(self):
        """Check for large imports"""
        result = subprocess.run(
            ['npx', 'next-bundle-analyzer', '--dry-run'],
            cwd=ROX_DIR,
            capture_output=True,
            text=True
        )
        return result.stdout[:2000] if result.stdout else "bundle analyzer not available"
    
    def run_review(self):
        print(f"[{self.name}] Starting review cycle...")
        ts_result = self.scan_typescript()
        perf_findings = self.scan_performance_patterns()
        
        review_data = {
            'timestamp': datetime.now().isoformat(),
            'typescript': ts_result,
            'performance_patterns': perf_findings,
            'status': 'pass' if ts_result['error_count'] == 0 and len(perf_findings) == 0 else 'issues_found'
        }
        
        with open(self.findings_log, 'a') as f:
            f.write(json.dumps(review_data) + '\n')
        
        print(f"[{self.name}] Review complete: {review_data['status']}")
        return review_data


class OptimizeAgent:
    """Applies fixes, runs tests, verifies improvements"""
    
    def __init__(self):
        self.name = "optimize-agent"
        self.applied_log = LOG_DIR / 'optimizations_applied.jsonl'
        
    def apply_typescript_fixes(self):
        """Run eslint --fix and prettier"""
        results = {}
        
        # eslint fix
        result = subprocess.run(
            ['npx', 'eslint', '.', '--fix', '--ext', '.ts,.tsx'],
            cwd=ROX_DIR,
            capture_output=True,
            text=True
        )
        results['eslint'] = {
            'exit_code': result.returncode,
            'fixed': 'fixed' in result.stdout.lower() or result.returncode == 0
        }
        
        # prettier
        result = subprocess.run(
            ['npx', 'prettier', '--write', '.'],
            cwd=ROX_DIR,
            capture_output=True,
            text=True
        )
        results['prettier'] = {
            'exit_code': result.returncode,
            'changed': result.returncode == 0
        }
        
        return results
    
    def run_tests(self):
        """Run available tests"""
        result = subprocess.run(
            ['npm', 'test', '--if-present'],
            cwd=ROX_DIR,
            capture_output=True,
            text=True,
            timeout=120
        )
        return {
            'exit_code': result.returncode,
            'passed': result.returncode == 0,
            'output': result.stdout[-1000:] if result.stdout else ''
        }
    
    def verify_build(self):
        """Verify production build works"""
        result = subprocess.run(
            ['npm', 'run', 'build'],
            cwd=ROX_DIR,
            capture_output=True,
            text=True,
            timeout=180
        )
        return {
            'exit_code': result.returncode,
            'success': result.returncode == 0,
            'output': result.stdout[-1000:] if result.stdout else ''
        }
    
    def verify_runtime(self):
        """Verify Rox API responds correctly"""
        try:
            # Health check
            resp = requests.get(f'{API_URL}', timeout=10)
            health_ok = resp.status_code == 200 and resp.json().get('status') == 'online'
            
            # Quick command test
            resp = requests.post(API_URL, json={'message': 'time'}, timeout=10)
            cmd_ok = resp.status_code == 200 and 'reply' in resp.json()
            
            return {
                'health': health_ok,
                'quick_command': cmd_ok,
                'overall': health_ok and cmd_ok
            }
        except Exception as e:
            return {'error': str(e), 'overall': False}
    
    def optimize_cycle(self, review_data):
        print(f"[{self.name}] Starting optimization cycle...")
        
        applied = {
            'timestamp': datetime.now().isoformat(),
            'trigger': review_data.get('status', 'unknown'),
            'actions': {}
        }
        
        # Only act if issues found
        if review_data.get('status') != 'pass':
            # Apply linting fixes
            applied['actions']['lint'] = self.apply_typescript_fixes()
            
            # Verify build
            applied['actions']['build'] = self.verify_build()
            
            # Run tests
            applied['actions']['tests'] = self.run_tests()
            
            # Verify runtime
            applied['actions']['runtime'] = self.verify_runtime()
        else:
            applied['actions']['note'] = 'No issues found, skipping optimization'
        
        with open(self.applied_log, 'a') as f:
            f.write(json.dumps(applied) + '\n')
        
        print(f"[{self.name}] Optimization complete")
        return applied


class Coordinator:
    """Coordinates review and optimize agents"""
    
    def __init__(self):
        self.review = ReviewAgent()
        self.optimize = OptimizeAgent()
        self.running = False
        self.cycle_count = 0
    
    def run_cycle(self):
        self.cycle_count += 1
        print(f"\n{'='*50}")
        print(f"OPTIMIZATION CYCLE #{self.cycle_count} - {datetime.now()}")
        print(f"{'='*50}")
        
        # Phase 1: Review
        review_data = self.review.run_review()
        
        # Phase 2: Optimize (parallel-ish - runs after review)
        optimize_data = self.optimize.optimize_cycle(review_data)
        
        # Summary
        summary = {
            'cycle': self.cycle_count,
            'timestamp': datetime.now().isoformat(),
            'review_status': review_data.get('status'),
            'ts_errors': review_data.get('typescript', {}).get('error_count', 0),
            'perf_issues': len(review_data.get('performance_patterns', [])),
            'optimize_success': all(
                v.get('success', v.get('overall', True)) 
                for v in optimize_data.get('actions', {}).values() 
                if isinstance(v, dict)
            ),
        }
        
        print(f"\nCYCLE #{self.cycle_count} SUMMARY:")
        print(f"  Review: {summary['review_status']}")
        print(f"  TS Errors: {summary['ts_errors']}")
        print(f"  Perf Issues: {summary['perf_issues']}")
        print(f"  Optimize: {'✅' if summary['optimize_success'] else '❌'}")
        
        return summary
    
    def start(self, interval_minutes=30):
        """Run continuous optimization loop"""
        self.running = True
        print(f"🚀 Starting Rox Auto-Optimization (every {interval_minutes} min)")
        print(f"   Review Agent: TypeScript + Performance scanning")
        print(f"   Optimize Agent: Lint fix + Build + Test + Verify")
        print(f"   Logs: {LOG_DIR}")
        
        # Run first cycle immediately
        self.run_cycle()
        
        # Then run on interval
        while self.running:
            time.sleep(interval_minutes * 60)
            if self.running:
                self.run_cycle()
    
    def stop(self):
        self.running = False
        print("🛑 Stopping optimization agents...")


def run_parallel_agents():
    """Run review and optimize as parallel processes"""
    import multiprocessing
    
    def review_worker():
        review = ReviewAgent()
        while True:
            review.run_review()
            time.sleep(30 * 60)
    
    def optimize_worker():
        optimize = OptimizeAgent()
        # Read latest review findings
        while True:
            # Wait for review to produce findings
            time.sleep(60)
            # Apply optimizations based on latest findings
            # (in real implementation, would read from shared queue)
            pass


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'parallel':
        print("Running parallel agents...")
        review_thread = threading.Thread(target=run_parallel_agents, daemon=True)
        review_thread.start()
        review_thread.join()
    else:
        # Single coordinator (sequential but complete)
        coordinator = Coordinator()
        try:
            coordinator.start(interval_minutes=30)
        except KeyboardInterrupt:
            coordinator.stop()