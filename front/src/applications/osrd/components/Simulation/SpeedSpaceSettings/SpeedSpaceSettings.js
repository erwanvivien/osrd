import { updateMustRedraw, updateSpeedSpaceSettings } from 'reducers/osrdsimulation';
import { useDispatch, useSelector } from 'react-redux';

import CheckboxRadioSNCF from 'common/BootstrapSNCF/CheckboxRadioSNCF';
import PropTypes from 'prop-types';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function SpeedSpaceSettings(props) {
  const { showSettings } = props;
  const { t } = useTranslation(['simulation']);
  const dispatch = useDispatch();
  const { speedSpaceSettings } = useSelector((state) => state.osrdsimulation);

  const toggleSetting = (settingName) => {
    dispatch(
      updateSpeedSpaceSettings({
        ...speedSpaceSettings,
        [settingName]: !speedSpaceSettings[settingName],
      })
    );
    dispatch(updateMustRedraw(true));
  };

  return (
    <div
      className={`${showSettings ? 'ml-5' : ''} showSettings`}
      style={showSettings ? { width: 'auto' } : { width: 0 }}
    >
      <div className="h2 d-flex align-items-center">{t('speedSpaceSettings.display')}</div>
      <CheckboxRadioSNCF
        id="speedSpaceSettings-altitude"
        name="speedSpaceSettings-altitude"
        label={t('speedSpaceSettings.altitude')}
        checked={speedSpaceSettings.altitude}
        onChange={() => toggleSetting('altitude')}
        type="checkbox"
      />
      <CheckboxRadioSNCF
        id="speedSpaceSettings-curves"
        name="speedSpaceSettings-curves"
        label={t('speedSpaceSettings.curves')}
        checked={speedSpaceSettings.curves}
        onChange={() => toggleSetting('curves')}
        type="checkbox"
      />
      <CheckboxRadioSNCF
        id="speedSpaceSettings-maxSpeed"
        name="speedSpaceSettings-maxSpeed"
        label={t('speedSpaceSettings.maxSpeed')}
        checked={speedSpaceSettings.maxSpeed}
        onChange={() => toggleSetting('maxSpeed')}
        type="checkbox"
      />
      <CheckboxRadioSNCF
        id="speedSpaceSettings-slopes"
        name="speedSpaceSettings-slopes"
        label={t('speedSpaceSettings.slopes')}
        checked={speedSpaceSettings.slopes}
        onChange={() => toggleSetting('slopes')}
        type="checkbox"
      />
    </div>
  );
}

SpeedSpaceSettings.propTypes = {
  showSettings: PropTypes.bool.isRequired,
};
