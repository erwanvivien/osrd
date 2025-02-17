package fr.sncf.osrd.railjson.schema.rollingstock;

import com.squareup.moshi.Json;
import com.squareup.moshi.JsonAdapter;
import com.squareup.moshi.Moshi;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import fr.sncf.osrd.railjson.schema.common.Identified;
import fr.sncf.osrd.train.RollingStock;

public class RJSRollingStock implements Identified {
    public static final JsonAdapter<RJSRollingStock> adapter = new Moshi
            .Builder()
            .add(RJSRollingResistance.adapter)
            .build()
            .adapter(RJSRollingStock.class);

    public static final transient String CURRENT_VERSION = "2.1";

    /**
     * The version of the rolling stock format used
     */
    public String version = null;

    /**
     * A unique train identifier
     */
    public String name = null;

    /**
     * <p>Engineers measured a number of effort curves for each rolling stock.
     * These are referenced from effort curve profiles.
     * Effort curves associate a speed to a traction force.
     * https://en.wikipedia.org/wiki/Tractive_force#Tractive_effort_curves</p>
     * This match the default effort curve to take
     */
    @Json(name = "effort_curve")
    public RJSEffortCurve effortCurve;

    /**
     * the length of the train, in meters.
     */
    public double length = Double.NaN;

    /**
     * The max speed of the train, in meters per seconds.
     */
    @Json(name = "max_speed")
    public double maxSpeed = Double.NaN;

    /**
     * The time the train takes to start up, in seconds.
     * During this time, the train's maximum acceleration is limited.
     */
    @Json(name = "startup_time")
    public double startUpTime = Double.NaN;

    /**
     * The acceleration to apply during the startup state.
     */
    @Json(name = "startup_acceleration")
    public double startUpAcceleration = Double.NaN;

    /**
     * The maximum acceleration when the train is in its regular operating mode.
     */
    @Json(name = "comfort_acceleration")
    public double comfortAcceleration = Double.NaN;

    /**
     * The braking deceleration coefficient can be the max or constant (depends on type field).
     */
    public RJSGamma gamma = null;


    /**
     * Inertia coefficient.
     * The mass alone isn't sufficient to compute accelerations, as the wheels and internals
     * also need force to get spinning. This coefficient can be used to account for the difference.
     * It's without unit: effective mass = mass * inertia coefficient
     */
    @Json(name = "inertia_coefficient")
    public double inertiaCoefficient = Double.NaN;

    @Json(name = "power_class")
    public int powerClass = -1;

    /**
     * The list of equipments (protection systems, signaling equipment) the train is able to deal with
     */
    public RJSTrainFeature[] features = new RJSTrainFeature[0];

    /**
     * The mass of the train
     */
    public double mass = Double.NaN;

    @Json(name = "rolling_resistance")
    public RJSRollingResistance rollingResistance = null;

    @Json(name = "loading_gauge")
    public RJSLoadingGaugeType loadingGauge = null;

    @SuppressFBWarnings("UWF_NULL_FIELD")
    public static final class RJSEffortCurve {
        public double[] speeds = null;
        @Json(name = "max_efforts")
        public double[] maxEfforts = null;
    }

    @SuppressFBWarnings("UWF_NULL_FIELD")
    public static final class RJSGamma {
        public double value = Double.NaN;
        public RollingStock.GammaType type = null;
    }

    @Override
    public String getID() {
        return name;
    }
}
