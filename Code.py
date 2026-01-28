import asyncio
import asyncpg
from dotenv import load_dotenv
import os

load_dotenv()
PG_HOST=os.getenv("PG_HOST")
PG_PORT=os.getenv("PG_PORT")
PG_DBNAME=os.getenv("PG_DBNAME")
PG_USER=os.getenv("PG_USER")
PG_PASSWORD=os.getenv("PG_PASSWORD")

async def test_dtb():
    conn = await asyncpg.connect(
            host=PG_HOST, 
            port=int(PG_PORT),
            database=PG_DBNAME,
            user=PG_USER, 
            password=PG_PASSWORD
        )
    #conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    rows = await conn.fetch('SELECT * FROM users;')
    print(rows)
    print("Finish")

async def add_data_dtb():
    conn = await asyncpg.connect(
            host=PG_HOST, 
            port=int(PG_PORT),
            database=PG_DBNAME,
            user=PG_USER, 
            password=PG_PASSWORD
        )
    await conn.execute(
        'INSERT INTO "users" ( "email", "password_hash") VALUES ($1, $2)',
        "example@gmail.com", '1234'
    )
    print("Finish insert into dtb")
asyncio.run(test_dtb())
#asyncio.run(add_data_dtb())