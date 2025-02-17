package fr.sncf.osrd.railjson.schema.infra;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import fr.sncf.osrd.railjson.schema.common.ID;
import fr.sncf.osrd.railjson.schema.common.Identified;
import fr.sncf.osrd.railjson.schema.common.RJSObjectRef;
import fr.sncf.osrd.railjson.schema.common.graph.EdgeEndpoint;
import fr.sncf.osrd.railjson.schema.infra.trackranges.RJSLoadingGaugeLimit;
import fr.sncf.osrd.railjson.schema.infra.trackranges.RJSCurve;
import fr.sncf.osrd.railjson.schema.infra.trackranges.RJSSlope;
import fr.sncf.osrd.utils.geom.LineString;
import java.util.List;

@SuppressFBWarnings({"UWF_FIELD_NOT_INITIALIZED_IN_CONSTRUCTOR", "UWF_UNWRITTEN_PUBLIC_OR_PROTECTED_FIELD"})
public class RJSTrackSection implements Identified {
    public String id;
    public double length;

    public List<RJSSlope> slopes;
    public List<RJSCurve> curves;
    public List<RJSLoadingGaugeLimit> loadingGaugeLimits;

    public LineString geo;
    public LineString sch;

    public RJSTrackSection(String id, double length) {
        this.id = id;
        this.length = length;
    }

    @Override
    public String getID() {
        return id;
    }

    public RJSTrackEndpoint beginEndpoint() {
        return new RJSTrackEndpoint(new RJSObjectRef<>(ID.from(this), "TrackSection"), EdgeEndpoint.BEGIN);
    }

    public RJSTrackEndpoint endEndpoint() {
        return new RJSTrackEndpoint(new RJSObjectRef<>(ID.from(this), "TrackSection"), EdgeEndpoint.END);
    }

}
