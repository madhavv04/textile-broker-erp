"""sync schema updates

Revision ID: 7a8b9c0d1e2f
Revises: 69aa2b7e92a8
Create Date: 2026-09-03 00:28:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a8b9c0d1e2f'
down_revision: Union[str, Sequence[str], None] = ('1d9a18f7506b', '69aa2b7e92a8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Party schema updates
    op.add_column('parties', sa.Column('address', sa.String(), nullable=True))
    op.add_column('parties', sa.Column('weaver_name', sa.String(), nullable=True))
    op.add_column('parties', sa.Column('gst_number', sa.String(), nullable=True))
    op.add_column('parties', sa.Column('quality_name', sa.String(), nullable=True))
    
    # Order schema updates (rename width to taka)
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.alter_column('width', new_column_name='taka', existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.alter_column('taka', new_column_name='width', existing_type=sa.String(), nullable=True)

    op.drop_column('parties', 'quality_name')
    op.drop_column('parties', 'gst_number')
    op.drop_column('parties', 'weaver_name')
    op.drop_column('parties', 'address')
