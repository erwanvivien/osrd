package fr.sncf.osrd.infra.implementation.tracks.undirected;

import com.google.common.base.MoreObjects;
import com.google.common.collect.*;
import fr.sncf.osrd.infra.api.Direction;
import fr.sncf.osrd.infra.api.tracks.undirected.*;
import fr.sncf.osrd.utils.geom.LineString;
import fr.sncf.osrd.utils.jacoco.ExcludeFromGeneratedCodeCoverage;
import java.util.EnumMap;

public class TrackSectionImpl implements TrackSection {

    private final double length;
    private final String id;
    private final ImmutableSet<OperationalPoint> operationalPoints;
    EnumMap<Direction, RangeMap<Double, SpeedLimits>> speedSections;
    EnumMap<Direction, RangeMap<Double, Double>> gradients;
    ImmutableList<Detector> detectors = ImmutableList.of();
    int index;
    private final LineString geo;
    private final LineString sch;
    private final ImmutableRangeMap<Double, LoadingGaugeConstraint> loadingGaugeConstraints;

    @Override
    @ExcludeFromGeneratedCodeCoverage
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("length", length)
                .add("id", id)
                .toString();
    }

    /** Constructor */
    public TrackSectionImpl(
            double length,
            String id,
            ImmutableSet<OperationalPoint> operationalPoints,
            LineString geo,
            LineString sch,
            ImmutableRangeMap<Double, LoadingGaugeConstraint> loadingGaugeConstraints
    ) {
        this.length = length;
        this.id = id;
        this.operationalPoints = operationalPoints;
        this.geo = geo;
        this.sch = sch;
        this.loadingGaugeConstraints = loadingGaugeConstraints;
    }

    /** Constructor with empty operational points and geometry */
    public TrackSectionImpl(
            double length,
            String id
    ) {
        this.length = length;
        this.id = id;
        this.loadingGaugeConstraints = ImmutableRangeMap.of();
        this.geo = null;
        this.sch = null;
        this.operationalPoints = ImmutableSet.of();
        speedSections = new EnumMap<>(Direction.class);
        for (var dir : Direction.values())
            speedSections.put(dir, ImmutableRangeMap.of());
    }

    @Override
    public double getLength() {
        return length;
    }

    @Override
    public ImmutableList<Detector> getDetectors() {
        return detectors;
    }

    @Override
    public EnumMap<Direction, RangeMap<Double, Double>> getGradients() {
        return gradients;
    }

    @Override
    public EnumMap<Direction, RangeMap<Double, SpeedLimits>> getSpeedSections() {
        return speedSections;
    }

    @Override
    public int getIndex() {
        return index;
    }

    @Override
    public ImmutableSet<OperationalPoint> getOperationalPoints() {
        return operationalPoints;
    }

    @Override
    public String getID() {
        return id;
    }

    @Override
    public ImmutableRangeMap<Double, LoadingGaugeConstraint> getLoadingGaugeConstraints() {
        return loadingGaugeConstraints;
    }

    @Override
    public LineString getGeo() {
        return geo;
    }

    @Override
    public LineString getSch() {
        return sch;
    }
}
