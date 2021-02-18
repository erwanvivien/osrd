package fr.sncf.osrd.infra.trackgraph;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import fr.sncf.osrd.infra.InvalidInfraException;
import fr.sncf.osrd.infra.OperationalPoint;
import fr.sncf.osrd.infra.SpeedSection;
import fr.sncf.osrd.infra.graph.AbstractEdge;
import fr.sncf.osrd.infra.graph.EdgeDirection;
import fr.sncf.osrd.infra.graph.EdgeEndpoint;
import fr.sncf.osrd.infra.graph.Graph;
import fr.sncf.osrd.infra.interlocking.TrackSensor;
import fr.sncf.osrd.infra.interlocking.VisibleTrackObject;
import fr.sncf.osrd.util.*;

import java.util.ArrayList;
import java.util.List;

/**
 * An edge in the topological graph.
 */
@SuppressFBWarnings({"URF_UNREAD_PUBLIC_OR_PROTECTED_FIELD"})
public final class TrackSection extends AbstractEdge<TrackNode, TrackSection> {
    public final String id;

    public final CryoList<TrackSection> startNeighbors = new CryoList<>();
    public final CryoList<TrackSection> endNeighbors = new CryoList<>();
    public final CryoList<BufferStop> bufferStops = new CryoList<>();

    /**
     * Given a side of the edge, return the list of neighbors
     * @param endpoint the end of the edge to consider
     * @return the list of neighbors at this end
     */
    public List<TrackSection> getNeighbors(EdgeEndpoint endpoint) {
        if (endpoint == EdgeEndpoint.BEGIN)
            return startNeighbors;
        return endNeighbors;
    }

    @Override
    public List<TrackSection> getNeighbors(EdgeEndpoint endpoint, Graph<TrackNode, TrackSection> graph) {
        return getNeighbors(endpoint);
    }

    @Override
    public String toString() {
        return String.format("TrackSection { id=%s }", id);
    }

    /**
     * Create a new topological edge.
     * This constructor is private, as the edge should also be registered into the nodes.
     */
    private TrackSection(
            String id,
            int startNodeIndex,
            int endNodeIndex,
            double length
    ) {
        super(startNodeIndex, endNodeIndex, length);
        this.id = id;
    }

    /**
     * Link two nodes with a new edge.
     *
     * @param startNodeIndex The index of the start node of the edge
     * @param endNodeIndex The index of the end node of the edge
     * @param id A unique identifier for the edge
     * @param length The length of the edge, in meters
     * @return A new edge
     */
    public static TrackSection linkNodes(
            int startNodeIndex,
            int endNodeIndex,
            String id,
            double length
    ) {
        return new TrackSection(id, startNodeIndex, endNodeIndex, length);
    }

    public static void linkEdges(
            TrackSection edgeA,
            EdgeEndpoint positionOnA,
            TrackSection edgeB,
            EdgeEndpoint positionOnB
    ) {
        edgeA.getNeighbors(positionOnA).add(edgeB);
        edgeB.getNeighbors(positionOnB).add(edgeA);
    }


    /**
     * Gets the last valid edge position along a direction
     * @param direction the direction to consider positioning from
     * @return the last valid edge position
     */
    public double lastPosition(EdgeDirection direction) {
        if (direction == EdgeDirection.START_TO_STOP)
            return length;
        return 0.0;
    }

    /**
     * Gets the first valid edge position along a direction
     * @param direction the direction to consider positioning from
     * @return the first valid edge position
     */
    public double firstPosition(EdgeDirection direction) {
        if (direction == EdgeDirection.START_TO_STOP)
            return 0.0;
        return length;
    }

    @SuppressFBWarnings({"UPM_UNCALLED_PRIVATE_METHOD"})
    private <ValueT> void validatePoints(PointSequence<ValueT> points) throws InvalidInfraException {
        if (points.getFirstPosition() < 0.)
            throw new InvalidInfraException(String.format("invalid PointSequence start for %s", id));
        if (points.getLastPosition() > length)
            throw new InvalidInfraException(String.format("invalid PointSequence end for %s", id));
    }

    private <ValueT> void validateRanges(RangeSequence<ValueT> ranges) throws InvalidInfraException {
        if (ranges.getFirstPosition() < 0.)
            throw new InvalidInfraException(String.format("invalid RangeSequence start for %s", id));
        if (ranges.getLastPosition() >= length)
            throw new InvalidInfraException(String.format("invalid RangeSequence end for %s", id));
    }

    /**
     * Ensure the edge data in consistent.
     * @throws InvalidInfraException when discrepancies are detected
     */
    public void validate() throws InvalidInfraException {
        validateRanges(slope);
        // TODO: validate speed limits
    }


    // the data structure used for the slope automatically negates it when iterated on backwards
    public final DoubleOrientedRangeSequence slope = new DoubleOrientedRangeSequence();
    public final ArrayList<RangeValue<SpeedSection>> speedSectionsForward = new ArrayList<>();
    public final ArrayList<RangeValue<SpeedSection>> speedSectionsBackward = new ArrayList<>();
    public final IntervalTree<OperationalPoint.Ref> operationalPoints = new IntervalTree<>();
    public final PointSequence<TrackSensor> trackSensorsBoth = new PointSequence<>();
    public final PointSequence<TrackSensor> trackSensorsForward = new PointSequence<>();
    public final PointSequence<TrackSensor> trackSensorsBackward = new PointSequence<>();
    public final PointSequence<VisibleTrackObject> visibleTrackObjectsForward = new PointSequence<>();
    public final PointSequence<VisibleTrackObject> visibleTrackObjectsBackward = new PointSequence<>();

    /*
     * All the functions below are attributes getters, meant to implement either RangeAttrGetter or PointAttrGetter.
     * These can be passed around to build generic algorithms on attributes.
     */

    public static RangeSequence<Double> getSlope(TrackSection edge, EdgeDirection direction) {
        return edge.slope;
    }

    /**
     * Gets the speed limit on a given section of track, along a given direction.
     * @param edge the section of track
     * @param direction the direction
     * @return the speed limits
     */
    public static ArrayList<RangeValue<SpeedSection>> getSpeedSections(TrackSection edge, EdgeDirection direction) {
        if (direction == EdgeDirection.START_TO_STOP)
            return edge.speedSectionsForward;
        return edge.speedSectionsBackward;
    }

    /**
     * Gets visible track objects on a given section of track, along a given direction.
     * @param edge the section of track
     * @param direction the direction
     * @return visible track objects
     */
    public static PointSequence<VisibleTrackObject> getVisibleTrackObjects(TrackSection edge, EdgeDirection direction) {
        if (direction == EdgeDirection.START_TO_STOP)
            return edge.visibleTrackObjectsForward;
        return edge.visibleTrackObjectsBackward;
    }
}
