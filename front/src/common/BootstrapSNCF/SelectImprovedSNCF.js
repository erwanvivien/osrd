import React, { useState, useEffect } from 'react';

import PropTypes from 'prop-types';

export default function SelectSNCF(props) {
  const { title, options, selectedValue, onChange, sm, withSearch } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(selectedValue);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [filterText, setFilterText] = useState('');

  const selectItem = (selectedOption) => {
    setSelectedItem(selectedOption);
    onChange(selectedOption);
    setIsOpen(false);
  };

  const renderOptions = () =>
    filteredOptions.map((option) => {
      const key = typeof option === 'string' ? option : option.key;
      const value = typeof option === 'string' ? option : option.value;
      return (
        <span className="select-menu-item" role="listitem" key={key}>
          <button type="button" onClick={() => selectItem(option)}>
            {value}
          </button>
        </span>
      );
    });

  const renderSelectedItem = () => {
    if (selectedItem) {
      return typeof selectedItem === 'string' ? selectedItem : selectedItem.value;
    }
    return null;
  };

  const filterOptions = (text) => {
    const localFilteredOptions = options.filter((el) =>
      el.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredOptions(text ? localFilteredOptions : options);
  };

  useEffect(() => {
    filterOptions(filterText);
  }, [filterText]);

  return (
    <>
      {title && <label htmlFor="select1">{title}</label>}
      <div className={`select-improved ${isOpen ? 'active' : ''}`}>
        <div className="select-control">
          <div
            className={`input-group ${sm ? 'input-group-sm' : ''}`}
            tabIndex={0}
            role="button"
            onClick={() => setIsOpen(!isOpen)}
          >
            <p
              className="form-control is-placeholder d-flex align-items-center"
              style={sm ? { minHeight: '1.813rem' } : ''}
            >
              {renderSelectedItem()}
            </p>
            <div className="input-group-append input-group-last">
              <button
                className="btn btn-primary btn-only-icon"
                style={sm ? { minHeight: '1.813rem' } : ''}
                type="button"
                aria-expanded="false"
                aria-controls="selecttoggle"
              >
                <i
                  className={`${isOpen ? 'icons-arrow-up' : 'icons-arrow-down'} icons-size-x75`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
          <div className="select-menu" id="-selecttoggle">
            <div className="d-flex flex-column">
              {withSearch && (
                <div className="form-control-container w-100 has-left-icon mb-3">
                  <input
                    className="form-control form-control-sm clear-option"
                    onChange={(e) => setFilterText(e.target.value)}
                    value={filterText}
                  />
                  <span className="form-control-state" />
                  <span className="form-control-icon">
                    <i className="icons-search" aria-hidden="true" />
                  </span>
                  {filterText && (
                    <button
                      type="button"
                      className="btn-clear btn-primary"
                      onClick={() => setFilterText('')}
                    >
                      <span className="sr-only">Clear text</span>
                      <i className="icons-close" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
              <div className="flex-fluid overflow-y" role="list" data-role="menu">
                {renderOptions()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

SelectSNCF.propTypes = {
  title: PropTypes.string,
  options: PropTypes.array.isRequired,
  selectedValue: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  onChange: PropTypes.func.isRequired,
  sm: PropTypes.bool,
  withSearch: PropTypes.bool,
};

SelectSNCF.defaultProps = {
  title: null,
  selectedValue: undefined,
  sm: false,
  withSearch: false,
};
