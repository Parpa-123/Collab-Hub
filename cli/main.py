import typer

from commands.init import init_repo
from commands.add import add_file
from commands.commit import commit_changes
from commands.push import push_changes
from commands.pull import pull

app = typer.Typer()

app.command()(init_repo)
app.command()(add_file)
app.command()(commit_changes)
app.command()(push_changes)
app.command()(pull)

if __name__ == "__main__":
    app()

