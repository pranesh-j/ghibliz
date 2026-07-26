from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('images', '0003_styleprompt'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserCustomStyle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('display_name', models.CharField(max_length=100)),
                ('style_key', models.CharField(max_length=80, unique=True)),
                ('prompt', models.TextField()),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='custom_styles', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Custom Style',
                'verbose_name_plural': 'User Custom Styles',
                'ordering': ['-created_at'],
            },
        ),
    ]
