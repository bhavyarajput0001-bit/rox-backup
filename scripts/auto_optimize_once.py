#!/usr/bin/env python3
"""
Single optimization cycle for cron job
"""

import sys
sys.path.insert(0, '/Users/bhavyarajput/Downloads/Rox')

from scripts.auto_optimize import Coordinator

if __name__ == '__main__':
    coordinator = Coordinator()
    coordinator.run_cycle()