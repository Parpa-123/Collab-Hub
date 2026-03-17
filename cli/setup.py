from setuptools import setup

setup(
    name = "ghlite",
    version = "0.1.0",
    py_modules = ["main"],
    install_requires = [
        "typer[all]",
        "requests",
    ],
    entry_points = {
        "console_scripts": [
            "ghlite = main:app",
        ],
    },
)