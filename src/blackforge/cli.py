"""CLI for deterministic BlackForge operations."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from blackforge.agents.referee import Referee
from blackforge.core.config import get_settings
from blackforge.core.schemas import BugCategory, Finding, Severity
from blackforge.core.storage import Storage


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="blackforge",
        description="BlackForge deterministic core — reproduce findings with evidence.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    reproduce = sub.add_parser(
        "reproduce",
        help="Run a failing test against a target repo and record a RefereeResult.",
    )
    reproduce.add_argument(
        "--repo",
        required=True,
        type=Path,
        help="Path to target repository (e.g. examples/buggy_python)",
    )
    reproduce.add_argument(
        "--test",
        required=True,
        help="Pytest target path relative to repo (e.g. tests/test_rolling_mean_none.py)",
    )
    reproduce.add_argument("--file", default="src/analytics/rolling.py")
    reproduce.add_argument("--function", default="rolling_mean")
    reproduce.add_argument("--location", default="line 48")
    reproduce.add_argument(
        "--description",
        default="rolling_mean fails when a valid window contains None values.",
    )
    reproduce.add_argument(
        "--observed",
        default="TypeError: unsupported operand type(s) for +: float and NoneType",
    )
    reproduce.add_argument(
        "--expected",
        default="Return a valid rolling result while treating None as missing.",
    )
    reproduce.add_argument(
        "--trigger",
        default="[1.0, 2.0, 3.0, None]; window=3",
    )
    reproduce.add_argument(
        "--local",
        action="store_true",
        help="Force local pytest instead of Docker.",
    )
    reproduce.add_argument(
        "--json",
        action="store_true",
        help="Print RefereeResult as JSON.",
    )

    serve = sub.add_parser("serve", help="Start the HTTP API used by the console.")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8000)
    serve.add_argument("--reload", action="store_true", help="Reload on code changes.")

    sub.add_parser("version", help="Print package version.")
    return parser


def cmd_reproduce(args: argparse.Namespace) -> int:
    settings = get_settings()
    storage = Storage(settings=settings)
    referee = Referee(settings=settings, storage=storage)

    test_path = Path(args.repo) / args.test
    if not test_path.exists():
        print(f"error: test not found: {test_path}", file=sys.stderr)
        return 2

    generated_test = test_path.read_text(encoding="utf-8")
    finding = Finding(
        category=BugCategory.PYTHON_LOGIC,
        file=args.file,
        function_or_query=args.function,
        location=args.location,
        description=args.description,
        triggering_input=args.trigger,
        expected_behavior=args.expected,
        observed_behavior=args.observed,
        reproduction_steps=[
            f"cd {args.repo}",
            f"pytest {args.test}",
        ],
        generated_test=generated_test,
        test_path=args.test,
        severity=Severity.HIGH,
        confidence=0.9,
    )

    result = referee.reproduce(
        args.repo,
        finding,
        prefer_docker=False if args.local else None,
    )

    if args.json:
        print(result.model_dump_json(indent=2))
    else:
        print(f"finding_id:   {result.finding_id}")
        print(f"reproduced:   {result.reproduced}")
        print(f"verdict:      {result.verdict.value}")
        print(f"confidence:   {result.confidence}")
        print(f"return_code:  {result.return_code}")
        print(f"duration_ms:  {result.duration_ms}")
        print(f"evidence:     {result.evidence}")
        print("--- execution_output ---")
        print(result.execution_output)

    return 0 if result.reproduced else 1


def cmd_serve(args: argparse.Namespace) -> int:
    import uvicorn

    uvicorn.run(
        "blackforge.api.app:create_app",
        factory=True,
        host=args.host,
        port=args.port,
        reload=args.reload,
    )
    return 0


def cmd_version(_: argparse.Namespace) -> int:
    from blackforge import __version__

    print(__version__)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "reproduce":
        return cmd_reproduce(args)
    if args.command == "serve":
        return cmd_serve(args)
    if args.command == "version":
        return cmd_version(args)
    parser.error(f"unknown command {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
