import asyncio
from datetime import date
from decimal import Decimal

from sqlalchemy import select

from app.db import AsyncSessionLocal, init_db
from app.models.account import Account
from app.models.customer import Customer
from app.models.loan import Loan

MOCK_CUSTOMERS = []


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
