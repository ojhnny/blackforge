from blackforge.verify.verifier import parse_pytest_counts


def test_parse_pytest_counts():
    assert parse_pytest_counts("3 passed in 0.1s") == (3, 3)
    assert parse_pytest_counts("1 failed, 2 passed in 0.1s") == (2, 3)
    assert parse_pytest_counts("1 failed, 1 passed, 1 error in 0.2s") == (1, 3)
    assert parse_pytest_counts("no tests ran") == (0, 0)
