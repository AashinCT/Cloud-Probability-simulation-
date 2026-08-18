"""
Test script to verify all modules work correctly.
Run this before launching the Streamlit app.
"""

import sys
import traceback

def test_data_generator():
    """Test data_generator module."""
    print("\n" + "="*60)
    print("Testing data_generator module...")
    print("="*60)
    
    try:
        import data_generator
        import numpy as np
        
        # Test data generation
        response_times = data_generator.generate_response_times(1000, 1.0, seed=42)
        assert len(response_times) == 1000, "Generated data size mismatch"
        print(f"✅ Generated {len(response_times)} response times")
        print(f"   Mean: {np.mean(response_times):.4f}")
        print(f"   Min: {np.min(response_times):.4f}, Max: {np.max(response_times):.4f}")
        
        # Test lambda estimation
        lambda_est = data_generator.estimate_lambda(response_times)
        print(f"✅ Estimated lambda: {lambda_est:.4f}")
        
        print("✅ data_generator module: PASSED")
        return True
    except Exception as e:
        print(f"❌ data_generator module: FAILED")
        print(f"   Error: {e}")
        traceback.print_exc()
        return False


def test_analysis():
    """Test analysis module."""
    print("\n" + "="*60)
    print("Testing analysis module...")
    print("="*60)
    
    try:
        import analysis
        import data_generator
        import numpy as np
        
        # Generate test data
        response_times = data_generator.generate_response_times(1000, 1.0, seed=42)
        
        # Test statistics
        stats = analysis.calculate_statistics(response_times)
        assert 'mean' in stats, "Missing mean in statistics"
        assert 'median' in stats, "Missing median in statistics"
        print(f"✅ Calculated statistics:")
        print(f"   Mean: {stats['mean']:.4f}")
        print(f"   Median: {stats['median']:.4f}")
        print(f"   Std Dev: {stats['std_dev']:.4f}")
        
        # Test percentiles
        percentiles = analysis.calculate_percentiles(response_times)
        print(f"✅ Calculated percentiles:")
        for p, v in percentiles.items():
            print(f"   P{p}: {v:.4f}")
        
        print("✅ analysis module: PASSED")
        return True
    except Exception as e:
        print(f"❌ analysis module: FAILED")
        print(f"   Error: {e}")
        traceback.print_exc()
        return False


def test_probability():
    """Test probability module."""
    print("\n" + "="*60)
    print("Testing probability module...")
    print("="*60)
    
    try:
        import probability
        import data_generator
        
        # Generate test data
        response_times = data_generator.generate_response_times(1000, 1.0, seed=42)
        
        # Test theoretical probabilities
        cdf = probability.theoretical_cdf(1.0, 1.0)
        print(f"✅ Theoretical CDF at t=1.0: {cdf:.4f}")
        
        survival = probability.theoretical_survival(1.0, 1.0)
        print(f"✅ Theoretical survival at t=1.0: {survival:.4f}")
        
        # Test empirical probabilities
        emp_cdf = probability.empirical_cdf(response_times, 1.0)
        print(f"✅ Empirical CDF at t=1.0: {emp_cdf:.4f}")
        
        emp_surv = probability.empirical_survival(response_times, 1.0)
        print(f"✅ Empirical survival at t=1.0: {emp_surv:.4f}")
        
        # Test comparison
        comparison = probability.calculate_probability_comparison(response_times, 1.0, 1.0)
        print(f"✅ Probability comparison calculated")
        
        print("✅ probability module: PASSED")
        return True
    except Exception as e:
        print(f"❌ probability module: FAILED")
        print(f"   Error: {e}")
        traceback.print_exc()
        return False


def test_sla():
    """Test SLA module."""
    print("\n" + "="*60)
    print("Testing SLA module...")
    print("="*60)
    
    try:
        import sla
        import data_generator
        
        # Generate test data
        response_times = data_generator.generate_response_times(1000, 1.0, seed=42)
        
        # Test SLA compliance
        result = sla.check_sla_compliance(response_times, 2.0, 95.0)
        print(f"✅ SLA compliance check:")
        print(f"   Threshold: {result['sla_threshold']}s")
        print(f"   Required: {result['sla_percentage_required']:.0f}%")
        print(f"   Actual: {result['actual_percentage']:.2f}%")
        print(f"   Status: {result['status']}")
        
        # Test threshold estimation
        threshold = sla.estimate_required_threshold(response_times, 95.0)
        print(f"✅ Estimated threshold for 95% SLA: {threshold:.4f}s")
        
        print("✅ sla module: PASSED")
        return True
    except Exception as e:
        print(f"❌ sla module: FAILED")
        print(f"   Error: {e}")
        traceback.print_exc()
        return False


def test_visualization():
    """Test visualization module."""
    print("\n" + "="*60)
    print("Testing visualization module...")
    print("="*60)
    
    try:
        import visualization
        import data_generator
        
        # Generate test data
        response_times = data_generator.generate_response_times(1000, 1.0, seed=42)
        
        # Test chart creation (just verify they don't crash)
        chart1 = visualization.create_histogram_chart(response_times)
        print(f"✅ Created histogram chart")
        
        chart2 = visualization.create_pdf_comparison_chart(response_times, 1.0)
        print(f"✅ Created PDF comparison chart")
        
        chart3 = visualization.create_cdf_chart(response_times, 1.0)
        print(f"✅ Created CDF chart")
        
        chart4 = visualization.create_percentile_chart(response_times)
        print(f"✅ Created percentile chart")
        
        print("✅ visualization module: PASSED")
        return True
    except Exception as e:
        print(f"❌ visualization module: FAILED")
        print(f"   Error: {e}")
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("\n")
    print("╔" + "="*58 + "╗")
    print("║" + " "*58 + "║")
    print("║" + "  SERVER RESPONSE TIME ANALYZER - MODULE TEST SUITE".center(58) + "║")
    print("║" + " "*58 + "║")
    print("╚" + "="*58 + "╝")
    
    results = []
    
    # Run all tests
    results.append(("data_generator", test_data_generator()))
    results.append(("analysis", test_analysis()))
    results.append(("probability", test_probability()))
    results.append(("sla", test_sla()))
    results.append(("visualization", test_visualization()))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for module_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{module_name:20} {status}")
    
    print("="*60)
    print(f"Total: {passed}/{total} passed")
    
    if passed == total:
        print("\n✅ All modules passed! Ready to launch Streamlit app.")
        print("\nTo run the app, execute:")
        print("  streamlit run app.py")
        return 0
    else:
        print(f"\n❌ {total - passed} module(s) failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
