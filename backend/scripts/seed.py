import asyncio
from datetime import date
from decimal import Decimal

from sqlalchemy import select

from app.db import AsyncSessionLocal, init_db
from app.models.account import Account
from app.models.customer import Customer
from app.models.loan import Loan

MOCK_CUSTOMERS = [
    {
        "full_name": "Ananya Rao",
        "email": "ananya.rao@example.com",
        "phone_number": "+919876540001",
        "date_of_birth": date(1995, 4, 12),
        "account_id": "AC10234501",
        "balance": Decimal("48250.75"),
        "emi_due_date": date(2026, 9, 28),
        "emi_amount": Decimal("8200.00"),
        "loan_status": "current",
    },
    {
        "full_name": "Rohit Malhotra",
        "email": "rohit.malhotra@example.com",
        "phone_number": "+919876540002",
        "date_of_birth": date(1991, 8, 23),
        "account_id": "AC10234502",
        "balance": Decimal("1200.00"),
        "emi_due_date": date(2026, 9, 5),
        "emi_amount": Decimal("15400.00"),
        "loan_status": "overdue",
    },
    {
        "full_name": "Priya Nair",
        "email": "priya.nair@example.com",
        "phone_number": "+919876540003",
        "date_of_birth": date(1997, 1, 17),
        "account_id": "AC10234503",
        "balance": Decimal("92310.20"),
        "emi_due_date": date(2026, 10, 12),
        "emi_amount": Decimal("6100.50"),
        "loan_status": "current",
    },
    {
        "full_name": "Sameer Iqbal",
        "email": "sameer.iqbal@example.com",
        "phone_number": "+919876540004",
        "date_of_birth": date(1989, 11, 5),
        "account_id": "AC10234504",
        "balance": Decimal("0.00"),
        "emi_due_date": date(2026, 1, 1),
        "emi_amount": Decimal("0.00"),
        "loan_status": "closed",
    },
    {
        "full_name": "Divya Krishnan",
        "email": "divya.krishnan@example.com",
        "phone_number": "+919876540005",
        "date_of_birth": date(1994, 6, 30),
        "account_id": "AC10234505",
        "balance": Decimal("15750.00"),
        "emi_due_date": date(2026, 9, 20),
        "emi_amount": Decimal("9800.00"),
        "loan_status": "overdue",
    },
    {
        "full_name": "Arjun Verma",
        "email": "arjun.verma@example.com",
        "phone_number": "+919876540006",
        "date_of_birth": date(1992, 3, 9),
        "account_id": "AC10234506",
        "balance": Decimal("63400.00"),
        "emi_due_date": date(2026, 10, 3),
        "emi_amount": Decimal("11200.00"),
        "loan_status": "current",
    },
]


async def seed():
    await init_db()

    async with AsyncSessionLocal() as session:
        seeded_count = 0
        updated_count = 0

        for data in MOCK_CUSTOMERS:
            result = await session.execute(
                select(Customer).where(Customer.email == data["email"])
            )

            customer = result.scalar_one_or_none()

            if customer is not None:
                if customer.date_of_birth != data["date_of_birth"]:
                    customer.date_of_birth = data["date_of_birth"]
                    updated_count += 1

                continue

            customer = Customer(
                full_name=data["full_name"],
                email=data["email"],
                phone_number=data["phone_number"],
                date_of_birth=data["date_of_birth"],
            )

            session.add(customer)

            await session.flush()

            account = Account(
                account_id=data["account_id"],
                balance=data["balance"],
                customer_id=customer.id,
            )

            loan = Loan(
                emi_due_date=data["emi_due_date"],
                emi_amount=data["emi_amount"],
                loan_status=data["loan_status"],
                customer_id=customer.id,
            )

            session.add(account)
            session.add(loan)

            seeded_count += 1

        await session.commit()

    print(f"Seed complete. Added={seeded_count}, Updated={updated_count}")


if __name__ == "__main__":
    asyncio.run(seed())
