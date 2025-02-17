# Generated by Django 4.1 on 2022-08-16 12:27

import django.contrib.gis.db.models.fields
import django.contrib.postgres.fields
import django.db.models.deletion
from django.db import migrations, models

import osrd_infra.schemas.generated
import osrd_infra.schemas.infra
import osrd_infra.schemas.path
import osrd_infra.schemas.rolling_stock
import osrd_infra.schemas.train_schedule
import osrd_infra.utils


def run_sql_add_foreign_key_infra(model_name: str):
    return migrations.RunSQL(
        f"""ALTER TABLE osrd_infra_{model_name}
                ADD infra_id INTEGER,
                ADD CONSTRAINT osrd_infra_{model_name}_fkey FOREIGN KEY (infra_id) REFERENCES osrd_infra_infra(id) ON DELETE CASCADE
            """,
        state_operations=[
            migrations.AddField(
                model_name=model_name,
                name="infra",
                field=models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to="osrd_infra.infra",
                ),
            ),
        ],
    )


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Infra",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=128)),
                ("railjson_version", models.CharField(default="2.3.1", editable=False, max_length=16)),
                ("owner", models.UUIDField(default="00000000-0000-0000-0000-000000000000", editable=False)),
                ("version", models.CharField(default="1", editable=False, max_length=40)),
                ("generated_version", models.CharField(editable=False, max_length=40, null=True)),
            ],
        ),
        migrations.CreateModel(
            name="PathModel",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("owner", models.UUIDField(default="00000000-0000-0000-0000-000000000000", editable=False)),
                ("created", models.DateTimeField(auto_now_add=True)),
                (
                    "payload",
                    models.JSONField(
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.path.PathPayload)]
                    ),
                ),
                (
                    "slopes",
                    models.JSONField(validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.path.Slopes)]),
                ),
                (
                    "curves",
                    models.JSONField(validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.path.Curves)]),
                ),
                ("geographic", django.contrib.gis.db.models.fields.LineStringField(srid=4326)),
                ("schematic", django.contrib.gis.db.models.fields.LineStringField(srid=4326)),
            ],
            options={
                "verbose_name_plural": "paths",
            },
        ),
        migrations.CreateModel(
            name="RollingStock",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("version", models.CharField(default="2.1", editable=False, max_length=16)),
                (
                    "name",
                    models.CharField(
                        help_text="A unique identifier for this rolling stock", max_length=255, unique=True
                    ),
                ),
                (
                    "effort_curve",
                    models.JSONField(
                        help_text="A curve mapping speed (in m/s) to maximum traction (in newtons)",
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.rolling_stock.EffortCurve)],
                    ),
                ),
                ("length", models.FloatField(help_text="The length of the train, in meters")),
                ("max_speed", models.FloatField(help_text="The maximum operational speed, in m/s")),
                (
                    "startup_time",
                    models.FloatField(help_text="The time the train takes before it can start accelerating"),
                ),
                (
                    "startup_acceleration",
                    models.FloatField(help_text="The maximum acceleration during startup, in m/s^2"),
                ),
                ("comfort_acceleration", models.FloatField(help_text="The maximum operational acceleration, in m/s^2")),
                (
                    "gamma",
                    models.JSONField(
                        help_text="The const or max braking coefficient, for timetabling purposes, in m/s^2",
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.rolling_stock.Gamma)],
                    ),
                ),
                (
                    "inertia_coefficient",
                    models.FloatField(
                        help_text="The inertia coefficient. It will be multiplied with the mass of the train to get its effective mass"
                    ),
                ),
                ("power_class", models.PositiveIntegerField()),
                (
                    "features",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(max_length=255),
                        blank=True,
                        help_text="A list of features the train exhibits, such as ERTMS support",
                        size=None,
                    ),
                ),
                ("mass", models.FloatField(help_text="The mass of the train, in kilograms")),
                (
                    "rolling_resistance",
                    models.JSONField(
                        help_text="The formula to use to compute rolling resistance",
                        validators=[
                            osrd_infra.utils.PydanticValidator(osrd_infra.schemas.rolling_stock.RollingResistance)
                        ],
                    ),
                ),
                (
                    "loading_gauge",
                    models.CharField(
                        choices=[
                            ("G1", "G1"),
                            ("G2", "G2"),
                            ("GA", "GA"),
                            ("GB", "GB"),
                            ("GB1", "GB1"),
                            ("GC", "GC"),
                            ("FR3.3", "FR3_3"),
                            ("FR3.3/GB/G2", "FR3_3_GB_G2"),
                            ("GLOTT", "GLOTT"),
                        ],
                        max_length=16,
                    ),
                ),
                ("image", models.ImageField(blank=True, null=True, upload_to="")),
            ],
        ),
        migrations.CreateModel(
            name="Timetable",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=128)),
            ],
        ),
        migrations.CreateModel(
            name="TrainScheduleModel",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("train_name", models.CharField(max_length=128)),
                ("departure_time", models.FloatField()),
                ("initial_speed", models.FloatField()),
                (
                    "labels",
                    models.JSONField(
                        default=[],
                        validators=[
                            osrd_infra.utils.PydanticValidator(osrd_infra.schemas.train_schedule.TrainScheduleLabels)
                        ],
                    ),
                ),
                (
                    "allowances",
                    models.JSONField(
                        default=[],
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.train_schedule.Allowances)],
                    ),
                ),
                (
                    "mrsp",
                    models.JSONField(
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.train_schedule.MRSP)]
                    ),
                ),
                ("base_simulation", models.JSONField()),
                ("eco_simulation", models.JSONField(null=True)),
                (
                    "rolling_stock",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="osrd_infra.rollingstock"),
                ),
            ],
        ),
        migrations.RunSQL(
            """ALTER TABLE osrd_infra_trainschedulemodel
                ADD path_id INTEGER,
                ADD CONSTRAINT osrd_infra_trainschedulemodel_path_fkey FOREIGN KEY (path_id) REFERENCES osrd_infra_pathmodel(id) ON DELETE CASCADE
            """,
            state_operations=[
                migrations.AddField(
                    model_name="trainschedulemodel",
                    name="path",
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="osrd_infra.pathmodel",
                    ),
                ),
            ],
        ),
        migrations.RunSQL(
            """ALTER TABLE osrd_infra_trainschedulemodel
                ADD timetable_id INTEGER,
                ADD CONSTRAINT osrd_infra_trainschedulemodel_timetable_fkey FOREIGN KEY (timetable_id) REFERENCES osrd_infra_timetable(id) ON DELETE CASCADE
            """,
            state_operations=[
                migrations.AddField(
                    model_name="trainschedulemodel",
                    name="timetable",
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="osrd_infra.timetable",
                        related_name="train_schedules",
                    ),
                )
            ],
        ),
        migrations.CreateModel(
            name="ErrorLayer",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "obj_type",
                    models.CharField(
                        choices=[
                            ("OperationalPoint", "OperationalPoint"),
                            ("Route", "Route"),
                            ("SwitchType", "SwitchType"),
                            ("Switch", "Switch"),
                            ("TrackSectionLink", "TrackSectionLink"),
                            ("SpeedSection", "SpeedSection"),
                            ("Catenary", "Catenary"),
                            ("TrackSection", "TrackSection"),
                            ("Signal", "Signal"),
                            ("BufferStop", "BufferStop"),
                            ("Detector", "Detector"),
                        ],
                        max_length=32,
                    ),
                ),
                ("obj_id", models.CharField(max_length=255)),
                ("geographic", django.contrib.gis.db.models.fields.GeometryField(null=True, srid=3857)),
                ("schematic", django.contrib.gis.db.models.fields.GeometryField(null=True, srid=3857)),
                (
                    "information",
                    models.JSONField(
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.generated.InfraError)]
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "generated errors",
            },
        ),
        migrations.CreateModel(
            name="TrackSectionModel",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                (
                    "data",
                    models.JSONField(
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.infra.TrackSection)]
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "track sections",
            },
        ),
        migrations.CreateModel(
            name="TrackSectionLinkModel",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                (
                    "data",
                    models.JSONField(
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.infra.TrackSectionLink)]
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "track section links",
            },
        ),
        migrations.CreateModel(
            name="TrackSectionLinkLayer",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                ("geographic", django.contrib.gis.db.models.fields.PointField(srid=3857)),
                ("schematic", django.contrib.gis.db.models.fields.PointField(srid=3857)),
            ],
            options={
                "verbose_name_plural": "generated track section links layer",
            },
        ),
        migrations.CreateModel(
            name="TrackSectionLayer",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                ("geographic", django.contrib.gis.db.models.fields.LineStringField(srid=3857)),
                ("schematic", django.contrib.gis.db.models.fields.LineStringField(srid=3857)),
            ],
            options={
                "verbose_name_plural": "generated track sections layer",
            },
        ),
        migrations.CreateModel(
            name="SwitchTypeModel",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                (
                    "data",
                    models.JSONField(
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.infra.SwitchType)]
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "switch types",
            },
        ),
        migrations.CreateModel(
            name="SwitchModel",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                (
                    "data",
                    models.JSONField(validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.infra.Switch)]),
                ),
            ],
            options={
                "verbose_name_plural": "switches",
            },
        ),
        migrations.CreateModel(
            name="SwitchLayer",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                ("geographic", django.contrib.gis.db.models.fields.PointField(srid=3857)),
                ("schematic", django.contrib.gis.db.models.fields.PointField(srid=3857)),
            ],
            options={
                "verbose_name_plural": "generated switch layer",
            },
        ),
        migrations.CreateModel(
            name="SpeedSectionModel",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                (
                    "data",
                    models.JSONField(
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.infra.SpeedSection)]
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "speed sections",
            },
        ),
        migrations.CreateModel(
            name="SpeedSectionLayer",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                ("geographic", django.contrib.gis.db.models.fields.MultiLineStringField(srid=3857)),
                ("schematic", django.contrib.gis.db.models.fields.MultiLineStringField(srid=3857)),
            ],
            options={
                "verbose_name_plural": "generated speed sections layer",
            },
        ),
        migrations.CreateModel(
            name="SignalModel",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                (
                    "data",
                    models.JSONField(validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.infra.Signal)]),
                ),
            ],
            options={
                "verbose_name_plural": "signals",
            },
        ),
        migrations.CreateModel(
            name="SignalLayer",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                ("geographic", django.contrib.gis.db.models.fields.PointField(srid=3857)),
                ("schematic", django.contrib.gis.db.models.fields.PointField(srid=3857)),
            ],
            options={
                "verbose_name_plural": "generated signals layer",
            },
        ),
        migrations.CreateModel(
            name="RouteModel",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                (
                    "data",
                    models.JSONField(validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.infra.Route)]),
                ),
            ],
            options={
                "verbose_name_plural": "routes",
            },
        ),
        migrations.CreateModel(
            name="RouteLayer",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                ("geographic", django.contrib.gis.db.models.fields.MultiLineStringField(srid=3857)),
                ("schematic", django.contrib.gis.db.models.fields.MultiLineStringField(srid=3857)),
            ],
            options={
                "verbose_name_plural": "generated route layer",
            },
        ),
        migrations.CreateModel(
            name="OperationalPointModel",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                (
                    "data",
                    models.JSONField(
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.infra.OperationalPoint)]
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "operational points",
            },
        ),
        migrations.CreateModel(
            name="OperationalPointLayer",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                ("geographic", django.contrib.gis.db.models.fields.MultiPointField(srid=3857)),
                ("schematic", django.contrib.gis.db.models.fields.MultiPointField(srid=3857)),
            ],
            options={
                "verbose_name_plural": "generated operational point layer",
            },
        ),
        migrations.CreateModel(
            name="DetectorModel",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                (
                    "data",
                    models.JSONField(
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.infra.Detector)]
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "detectors",
            },
        ),
        migrations.CreateModel(
            name="DetectorLayer",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                ("geographic", django.contrib.gis.db.models.fields.PointField(srid=3857)),
                ("schematic", django.contrib.gis.db.models.fields.PointField(srid=3857)),
            ],
            options={
                "verbose_name_plural": "generated detector layer",
            },
        ),
        migrations.CreateModel(
            name="CatenaryModel",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                (
                    "data",
                    models.JSONField(
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.infra.Catenary)]
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "catenaries",
            },
        ),
        migrations.CreateModel(
            name="CatenaryLayer",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                ("geographic", django.contrib.gis.db.models.fields.MultiLineStringField(srid=3857)),
                ("schematic", django.contrib.gis.db.models.fields.MultiLineStringField(srid=3857)),
            ],
            options={
                "verbose_name_plural": "generated catenary layer",
            },
        ),
        migrations.CreateModel(
            name="BufferStopModel",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                (
                    "data",
                    models.JSONField(
                        validators=[osrd_infra.utils.PydanticValidator(osrd_infra.schemas.infra.BufferStop)]
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "buffer stops",
            },
        ),
        migrations.CreateModel(
            name="BufferStopLayer",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("obj_id", models.CharField(max_length=255)),
                ("geographic", django.contrib.gis.db.models.fields.PointField(srid=3857)),
                ("schematic", django.contrib.gis.db.models.fields.PointField(srid=3857)),
            ],
            options={
                "verbose_name_plural": "generated buffer stop layer",
            },
        ),
    ]

    infra_foreign_models = ["pathmodel", "timetable", "errorlayer"]
    infra_obj_models = [
        "bufferstopmodel",
        "bufferstoplayer",
        "catenarymodel",
        "catenarylayer",
        "detectormodel",
        "detectorlayer",
        "operationalpointmodel",
        "operationalpointlayer",
        "routemodel",
        "routelayer",
        "signallayer",
        "signalmodel",
        "speedsectionlayer",
        "speedsectionmodel",
        "switchmodel",
        "switchlayer",
        "switchtypemodel",
        "tracksectionlayer",
        "tracksectionlinkmodel",
        "tracksectionlinklayer",
        "tracksectionmodel",
    ]

    for model in infra_foreign_models + infra_obj_models:
        operations.append(run_sql_add_foreign_key_infra(model))

    for model in infra_obj_models:
        operations.append(
            migrations.AlterUniqueTogether(
                name=model,
                unique_together={("infra", "obj_id")},
            )
        )
